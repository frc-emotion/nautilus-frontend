package org.team2658

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer
import java.util.*
import java.util.concurrent.ConcurrentHashMap

// Data class representing a detected beacon
data class Beacon(
    val uuid: String,
    val major: Int,
    val minor: Int,
    val rssi: Int,
    val timestamp: Long
)

// Event constants
const val BEACON_DETECTED_EVENT = "BeaconDetected"
const val BLUETOOTH_CHANGE_EVENT = "BluetoothStateChanged"

// BLEBeaconManager Module
class BLEBeaconManager : Module() {

    private val TAG = "BLEBeaconManager"

    // Apple’s Company ID in little endian
    private val companyId: Int = 0x004C

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null
    private var bluetoothLeScanner: BluetoothLeScanner? = null

    // Maps to manage advertisers and their callbacks
    private val advertiserMap: MutableMap<String, AdvertiseCallback> = ConcurrentHashMap()

    // Variables for scanning
    private var scanCallback: ScanCallback? = null
    private var isScanning: Boolean = false
    private var scanUUID: String? = null

    // Thread-safe list to store detected beacons
    private val detectedBeacons: MutableList<Beacon> = Collections.synchronizedList(mutableListOf())

    // BroadcastReceiver to listen for Bluetooth state changes
    private val bluetoothStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == BluetoothAdapter.ACTION_STATE_CHANGED) {
                val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
                val stateString = when (state) {
                    BluetoothAdapter.STATE_OFF -> "poweredOff"
                    BluetoothAdapter.STATE_TURNING_OFF -> "turningOff"
                    BluetoothAdapter.STATE_ON -> "poweredOn"
                    BluetoothAdapter.STATE_TURNING_ON -> "turningOn"
                    else -> "unknown"
                }
                Log.d(TAG, "Bluetooth state changed: $stateString")
                sendEvent(BLUETOOTH_CHANGE_EVENT, mapOf("state" to stateString))
            }
        }
    }

    override fun definition() = ModuleDefinition {
        Name("BLEBeaconManager")

        // Register events
        Events(BEACON_DETECTED_EVENT, BLUETOOTH_CHANGE_EVENT)

        // Define exported functions
        AsyncFunction("broadcast") { uuid: String, major: Int, minor: Int ->
            runBlocking {
                broadcastBeacon(uuid, major, minor)
            }
        }

        AsyncFunction("stopBroadcast") {
            runBlocking {
                stopAllBroadcasts()
            }
        }

        AsyncFunction("enableBluetooth") {
            runBlocking {
                enableBluetooth()
            }
        }

        AsyncFunction("disableBluetooth") {
            runBlocking {
                disableBluetooth()
            }
        }

        AsyncFunction("getBluetoothState") {
            runBlocking {
                getBluetoothState()
            }
        }

        AsyncFunction("startListening") { uuid: String, mode: Int ->
            runBlocking {
                startListening(uuid, mode)
            }
        }

        AsyncFunction("stopListening") {
            runBlocking {
                stopListening()
            }
        }

        AsyncFunction("getDetectedBeacons") {
            runBlocking {
                getDetectedBeacons()
            }
        }

        AsyncFunction("testBeaconEvent") {
            Log.i(TAG, "Sending test beacon event")
            sendEvent(BEACON_DETECTED_EVENT, bundleOf(
                "uuid" to "00000000-0000-0000-0000-000000000000",
                "major" to 0,
                "minor" to 0,
                "rssi" to -50,
                "timestamp" to System.currentTimeMillis()
            ))
        }

        OnCreate {
            initializeBluetooth()

        }

        OnDestroy {
            appContext.reactContext?.unregisterReceiver(bluetoothStateReceiver)
            // Ensure that broadcasting and scanning are stopped when the module is destroyed
            runBlocking {
                stopAllBroadcasts()
                stopListening()
            }
        }
    }

    /**
     * Initializes Bluetooth adapter and registers the Bluetooth state receiver.
     */
    private fun initializeBluetooth() {
        val bluetoothManager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter

        if (bluetoothAdapter == null) {
            Log.e(TAG, "Bluetooth adapter is null. Device may not support Bluetooth.")
            sendEvent(BLUETOOTH_CHANGE_EVENT, mapOf("state" to "unsupported"))
            return
        }

        // Register the BroadcastReceiver for Bluetooth state changes
        val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
        appContext.reactContext?.registerReceiver(bluetoothStateReceiver, filter)

        // Emit the current Bluetooth state
        val currentState = bluetoothAdapter?.state ?: BluetoothAdapter.STATE_OFF
        val stateString = when (currentState) {
            BluetoothAdapter.STATE_OFF -> "poweredOff"
            BluetoothAdapter.STATE_TURNING_OFF -> "turningOff"
            BluetoothAdapter.STATE_ON -> "poweredOn"
            BluetoothAdapter.STATE_TURNING_ON -> "turningOn"
            else -> "unknown"
        }
        Log.d(TAG, "Initial Bluetooth state: $stateString")
        sendEvent(BLUETOOTH_CHANGE_EVENT, mapOf("state" to stateString))
    }

    /**
     * Enables Bluetooth if it is not already enabled.
     * @return Confirmation message upon successful enabling.
     */
    private suspend fun enableBluetooth(): String = withContext(Dispatchers.Main) {
        if (bluetoothAdapter == null) {
            throw Exception("Bluetooth adapter not available.")
        }

        if (!bluetoothAdapter!!.isEnabled) {
            val enabled = bluetoothAdapter!!.enable()
            if (enabled) {
                "Bluetooth enabling initiated."
            } else {
                throw Exception("Failed to initiate Bluetooth enabling.")
            }
        } else {
            "Bluetooth is already enabled."
        }
    }

    /**
     * Disables Bluetooth if it is currently enabled.
     * @return Confirmation message upon successful disabling.
     */
    private suspend fun disableBluetooth(): String = withContext(Dispatchers.Main) {
        if (bluetoothAdapter == null) {
            throw Exception("Bluetooth adapter not available.")
        }

        if (bluetoothAdapter!!.isEnabled) {
            val disabled = bluetoothAdapter!!.disable()
            if (disabled) {
                "Bluetooth disabling initiated."
            } else {
                throw Exception("Failed to initiate Bluetooth disabling.")
            }
        } else {
            "Bluetooth is already disabled."
        }
    }

    /**
     * Retrieves the current Bluetooth state.
     * @return Current Bluetooth state as a string.
     */
    private suspend fun getBluetoothState(): String = withContext(Dispatchers.IO) {
        val currentState = bluetoothAdapter?.state ?: BluetoothAdapter.STATE_OFF
        when (currentState) {
            BluetoothAdapter.STATE_OFF -> "poweredOff"
            BluetoothAdapter.STATE_TURNING_OFF -> "turningOff"
            BluetoothAdapter.STATE_ON -> "poweredOn"
            BluetoothAdapter.STATE_TURNING_ON -> "turningOn"
            else -> "unknown"
        }
    }

    /**
     * Starts broadcasting a BLE beacon with the specified UUID, major, and minor values.
     * @param uuid UUID string.
     * @param major Major value.
     * @param minor Minor value.
     * @return Confirmation message upon successful broadcasting.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun broadcastBeacon(uuid: String, major: Int, minor: Int): String = withContext(Dispatchers.IO) {
        if (bluetoothAdapter == null) {
            Log.w(TAG, "Device does not support Bluetooth. Adapter is null.")
            throw Exception("Device does not support Bluetooth.")
        }

        if (!bluetoothAdapter!!.isEnabled) {
            Log.w(TAG, "Bluetooth is disabled.")
            throw Exception("Bluetooth is disabled.")
        }

        bluetoothLeAdvertiser = bluetoothAdapter!!.bluetoothLeAdvertiser

        if (bluetoothLeAdvertiser == null) {
            Log.w(TAG, "BluetoothLeAdvertiser is unavailable on this device.")
            throw Exception("BluetoothLeAdvertiser is unavailable.")
        }

        // Stop existing advertising with the same UUID if any
        advertiserMap[uuid]?.let { existingCallback ->
            bluetoothLeAdvertiser?.stopAdvertising(existingCallback)
            advertiserMap.remove(uuid)
            Log.i(TAG, "Stopped existing advertising for UUID: $uuid")
        }

        val advertiseSettings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .build()

        val advertiseData = buildAdvertiseData(uuid, major, minor)

        val callback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
                super.onStartSuccess(settingsInEffect)
                Log.i(TAG, "Advertising started successfully for UUID: $uuid")
            }

            override fun onStartFailure(errorCode: Int) {
                super.onStartFailure(errorCode)
                val errorMessage = when (errorCode) {
                    AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED -> "Advertising already started."
                    AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "Data too large."
                    AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers."
                    AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal error."
                    AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported."
                    else -> "Unknown error."
                }
                Log.e(TAG, "Advertising failed for UUID: $uuid with error: $errorMessage")
                
            }
        }

        bluetoothLeAdvertiser!!.startAdvertising(advertiseSettings, advertiseData, callback)
        advertiserMap[uuid] = callback
        Log.i(TAG, "Started advertising for UUID: $uuid")
        "Advertising started for UUID: $uuid"
    }

    /**
     * Stops all ongoing BLE beacon broadcasts.
     * @return Confirmation message upon successful stoppage.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun stopAllBroadcasts(): String = withContext(Dispatchers.IO) {
        try {
            advertiserMap.forEach { (uuid, callback) ->
                bluetoothLeAdvertiser?.stopAdvertising(callback)
                Log.i(TAG, "Stopped advertising for UUID: $uuid")
            }
            advertiserMap.clear()
            "All broadcasts stopped successfully."
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping broadcasts: ${e.message}", e)
            throw e
        }
    }

    /**
     * Builds the AdvertiseData for BLE broadcasting in iBeacon format.
     * @param uuid UUID string.
     * @param major Major value.
     * @param minor Minor value.
     * @return AdvertiseData instance.
     */
    private fun buildAdvertiseData(uuid: String, major: Int, minor: Int): AdvertiseData {
        val uuidBytes = uuidToBytes(uuid)
        val majorBytes = intToByteArray(major)
        val minorBytes = intToByteArray(minor)
        val txPower: Byte = 0xC7.toByte()

        val manufacturerData = ByteArray(23).apply {
            // iBeacon prefix
            this[0] = 0x02
            this[1] = 0x15
            // UUID
            System.arraycopy(uuidBytes, 0, this, 2, uuidBytes.size)
            // Major
            System.arraycopy(majorBytes, 0, this, 18, majorBytes.size)
            // Minor
            System.arraycopy(minorBytes, 0, this, 20, minorBytes.size)
            // Tx Power
            this[22] = txPower
        }

        return AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addManufacturerData(companyId, manufacturerData)
            .build()
    }

    /**
     * Converts a UUID string to a byte array.
     * @param uuid UUID string.
     * @return Byte array representation of the UUID.
     */
    private fun uuidToBytes(uuid: String): ByteArray {
        val parsedUUID = UUID.fromString(uuid)
        val byteBuffer = ByteBuffer.wrap(ByteArray(16))
        byteBuffer.putLong(parsedUUID.mostSignificantBits)
        byteBuffer.putLong(parsedUUID.leastSignificantBits)
        return byteBuffer.array()
    }

    /**
     * Converts an integer to a two-byte array.
     * @param value Integer value.
     * @return Byte array.
     */
    private fun intToByteArray(value: Int): ByteArray {
        return byteArrayOf(
            ((value shr 8) and 0xFF).toByte(),
            (value and 0xFF).toByte()
        )
    }

    /**
     * Starts listening for BLE beacons with the specified UUID.
     * @param uuid UUID string to listen for.
     * @return Confirmation message upon successful initiation of scanning.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun startListening(uuid: String, mode: Int): String = withContext(Dispatchers.IO) {
        if (bluetoothAdapter == null) {
            Log.w(TAG, "Bluetooth adapter is null. Cannot start scanning.")
            throw Exception("Bluetooth adapter is null. Cannot start scanning.")
        }

        if (isScanning) {
            Log.w(TAG, "Already scanning.")
            throw Exception("Already scanning.")
        }

        if (!bluetoothAdapter!!.isEnabled) {
            Log.w(TAG, "Bluetooth is disabled. Cannot start scanning.")
            throw Exception("Bluetooth is disabled. Cannot start scanning.")
        }

        bluetoothLeScanner = bluetoothAdapter!!.bluetoothLeScanner
        if (bluetoothLeScanner == null) {
            Log.w(TAG, "BluetoothLeScanner is unavailable.")
            throw Exception("BluetoothLeScanner is unavailable.")
        }

        scanUUID = uuid

        // Define ScanFilter for iBeacon
        val scanFilter = ScanFilter.Builder()
            .setManufacturerData(
                companyId,
                byteArrayOf(0x02, 0x15) // iBeacon prefix
            )
            .build()

        Log.w(TAG, "Scan mode: $mode")

        val scanMode = when (mode) {
            1 -> ScanSettings.SCAN_MODE_LOW_LATENCY
            2 -> ScanSettings.SCAN_MODE_BALANCED
            3 -> ScanSettings.SCAN_MODE_LOW_POWER
            else -> ScanSettings.SCAN_MODE_LOW_LATENCY
        }

        Log.w(TAG, "Scan mode2: $scanMode")

        val scanSettings = ScanSettings.Builder()
            .setScanMode(scanMode)
            .build()

        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                handleScanResult(result)
            }

            override fun onBatchScanResults(results: List<ScanResult>) {
                results.forEach { result ->
                    handleScanResult(result)
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "BLE Scan failed with error code $errorCode")
                throw Exception("BLE Scan failed with error code $errorCode")
            }
        }

        bluetoothLeScanner!!.startScan(listOf(scanFilter), scanSettings, scanCallback)
        isScanning = true
        Log.i(TAG, "Started BLE scanning for UUID: $uuid")
        "Started scanning for UUID: $uuid"
    }

    /**
     * Stops listening for BLE beacons.
     * @return Confirmation message upon successful stoppage of scanning.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun stopListening(): String = withContext(Dispatchers.IO) {
        try {
            if (!isScanning) {
                Log.w(TAG, "Not currently scanning.")
                return@withContext "Not currently scanning."
            }

            bluetoothLeScanner?.stopScan(scanCallback)
            scanCallback = null
            scanUUID = null
            isScanning = false
            Log.i(TAG, "Stopped BLE scanning.")
            "Stopped scanning successfully."
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping scanning: ${e.message}", e)
            throw e
        }
    }

    /**
     * Handles a scan result and adds it to the detectedBeacons list if it matches the UUID.
     * @param result ScanResult object.
     */
    private fun handleScanResult(result: ScanResult) {
        val scanRecord = result.scanRecord ?: return
        val beacon = parseIBeacon(scanRecord, result.rssi) ?: return

        Log.i(TAG, "Scan result: $beacon")

        if (beacon.uuid.equals(scanUUID, ignoreCase = true)) {
            synchronized(detectedBeacons) {
                // Update existing beacon or add new one
                val index = detectedBeacons.indexOfFirst {
                    it.uuid == beacon.uuid && it.major == beacon.major && it.minor == beacon.minor
                }
                if (index != -1) {
                    detectedBeacons[index] = beacon
                } else {
                    Log.i(TAG, "Detected beacon: $beacon")
                    // Wrap beacon data inside a 'beacon' key
                    this@BLEBeaconManager.sendEvent(
                        BEACON_DETECTED_EVENT,
                        bundleOf(
                                "uuid" to beacon.uuid,
                                "major" to beacon.major,
                                "minor" to beacon.minor,
                                //"rssi" to beacon.rssi,
                                "timestamp" to beacon.timestamp
                            
                        )
                    )
                    detectedBeacons.add(beacon)
                }
            }
        }
    }
    /**
     * Parses the scan record to extract iBeacon information.
     * @param scanRecord ScanRecord object.
     * @param rssi RSSI value from the ScanResult.
     * @return Beacon object if parsing is successful, null otherwise.
     */
    private fun parseIBeacon(scanRecord: ScanRecord, rssi: Int): Beacon? {
        val manufacturerData = scanRecord.getManufacturerSpecificData(companyId) ?: return null

        if (manufacturerData.size < 23) { // iBeacon data length
            return null
        }

        // Check iBeacon prefix
        if (manufacturerData[0].toInt() != 0x02 || manufacturerData[1].toInt() != 0x15) {
            return null
        }

        // Extract UUID
        val uuidBytes = manufacturerData.copyOfRange(2, 18)
        val uuid = bytesToUuid(uuidBytes) ?: return null

        // Extract Major
        val major = ((manufacturerData[18].toInt() and 0xFF) shl 8) or (manufacturerData[19].toInt() and 0xFF)

        // Extract Minor
        val minor = ((manufacturerData[20].toInt() and 0xFF) shl 8) or (manufacturerData[21].toInt() and 0xFF)

        val timestamp = System.currentTimeMillis()

        return Beacon(
            uuid = uuid.toString(),
            major = major,
            minor = minor,
            rssi = rssi,
            timestamp = timestamp
        )
    }

    /**
     * Converts a byte array to a UUID.
     * @param bytes Byte array.
     * @return UUID object or null if conversion fails.
     */
    private fun bytesToUuid(bytes: ByteArray): UUID? {
        return try {
            val byteBuffer = ByteBuffer.wrap(bytes)
            val high = byteBuffer.long
            val low = byteBuffer.long
            UUID(high, low)
        } catch (e: Exception) {
            Log.e(TAG, "Error converting bytes to UUID: ${e.message}", e)
            null
        }
    }

    /**
     * Returns the list of detected beacons.
     * @return List of beacons as a list of maps.
     */
    private suspend fun getDetectedBeacons(): List<Map<String, Any>> = withContext(Dispatchers.IO) {
        synchronized(detectedBeacons) {
            detectedBeacons.map { beacon ->
                mapOf(
                    "uuid" to beacon.uuid,
                    "major" to beacon.major,
                    "minor" to beacon.minor,
                    "rssi" to beacon.rssi,
                    "timestamp" to beacon.timestamp
                )
            }
        }
    }
}
