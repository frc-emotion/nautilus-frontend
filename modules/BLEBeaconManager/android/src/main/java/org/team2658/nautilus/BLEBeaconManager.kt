package org.team2658

import android.app.*
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.*
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.altbeacon.beacon.*
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

class BLEBeaconManager : Module(), BeaconConsumer {

    private val TAG = "BLEBeaconManager"

    // Apple’s company ID (0x004C) for iBeacon
    private val companyId: Int = 0x004C

    // System BLE references (for broadcasting)
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null

    // For BluetoothLeScanner-based listening
    private var bluetoothLeScanner: BluetoothLeScanner? = null
    private var scanCallback: ScanCallback? = null
    private var isBluetoothLeScannerScanning: Boolean = false

    // For AltBeacon scanning
    private var beaconManager: BeaconManager? = null
    private var region: Region? = null
    private var isAltBeaconScanning = false

    // The UUID we are filtering on (if provided)
    private var scanUUID: String? = null

    // Thread-safe list to store detected beacons
    private val detectedBeacons: MutableList<Beacon> = Collections.synchronizedList(mutableListOf())

    // Maps to manage advertising callbacks
    private val advertiserMap: MutableMap<String, AdvertiseCallback> = ConcurrentHashMap()

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

        Events(BEACON_DETECTED_EVENT, BLUETOOTH_CHANGE_EVENT)

        // Updated broadcast function accepting advertise mode and tx power level.
        AsyncFunction("broadcast") { uuid: String, major: Int, minor: Int, advertiseMode: Int, txPowerLevel: Int ->
            runBlocking {
                broadcastBeacon(uuid, major, minor, advertiseMode, txPowerLevel)
            }
        }

        AsyncFunction("stopBroadcast") {
            runBlocking { stopAllBroadcasts() }
        }

        AsyncFunction("enableBluetooth") {
            runBlocking { enableBluetooth() }
        }

        AsyncFunction("disableBluetooth") {
            runBlocking { disableBluetooth() }
        }

        AsyncFunction("getBluetoothState") {
            runBlocking { getBluetoothState() }
        }

        // New startListening that chooses method based on the mode parameter.
        // mode: 0 = AltBeacon scanning; 1 = BluetoothLeScanner scanning.
        AsyncFunction("startListening") { uuid: String, mode: Int ->
            runBlocking {
                if (mode == 0) {
                    Log.i(TAG, "Starting AltBeacon scanning for UUID: $uuid")
                    startAltBeaconScanning(uuid)
                } else if (mode == 1) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        Log.i(TAG, "Starting BluetoothLeScanner listening for UUID: $uuid")
                        startBluetoothLeScannerListening(uuid)
                    } else {
                        throw Exception("BluetoothLeScanner requires Lollipop or higher.")
                    }
                } else {
                    throw Exception("Invalid listening mode. Use 0 for AltBeacon, 1 for BluetoothLeScanner.")
                }
            }
        }

        // Stop listening for both methods if active.
        AsyncFunction("stopListening") {
            runBlocking {
                if (isAltBeaconScanning) {
                    stopAltBeaconScanning()
                }
                if (isBluetoothLeScannerScanning) {
                    stopBluetoothLeScannerListening()
                }
            }
        }

        AsyncFunction("getDetectedBeacons") {
            runBlocking { getDetectedBeacons() }
        }

        AsyncFunction("testBeaconEvent") {
            Log.i(TAG, "Sending test beacon event")
            sendEvent(
                BEACON_DETECTED_EVENT, bundleOf(
                    "uuid" to "00000000-0000-0000-0000-000000000000",
                    "major" to 0,
                    "minor" to 0,
                    "rssi" to -50,
                    "timestamp" to System.currentTimeMillis()
                )
            )
        }

        OnCreate { initializeBluetooth() }
        OnDestroy {
            appContext.reactContext?.unregisterReceiver(bluetoothStateReceiver)
            runBlocking {
                stopAllBroadcasts()
                stopAltBeaconScanning()
                if (isBluetoothLeScannerScanning) stopBluetoothLeScannerListening()
            }
        }
    }

    // ------------------------- Initialization & Bluetooth State -------------------------
    private fun initializeBluetooth() {
        val manager = appContext.reactContext
            ?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        if (bluetoothAdapter == null) {
            Log.e(TAG, "Bluetooth adapter is null. Device may not support Bluetooth.")
            sendEvent(BLUETOOTH_CHANGE_EVENT, mapOf("state" to "unsupported"))
            return
        }
        val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
        appContext.reactContext?.registerReceiver(bluetoothStateReceiver, filter)
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

    private suspend fun enableBluetooth(): String = withContext(Dispatchers.Main) {
        if (bluetoothAdapter == null) throw Exception("Bluetooth adapter not available.")
        if (!bluetoothAdapter!!.isEnabled) {
            if (bluetoothAdapter!!.enable()) "Bluetooth enabling initiated."
            else throw Exception("Failed to enable Bluetooth.")
        } else "Bluetooth is already enabled."
    }

    private suspend fun disableBluetooth(): String = withContext(Dispatchers.Main) {
        if (bluetoothAdapter == null) throw Exception("Bluetooth adapter not available.")
        if (bluetoothAdapter!!.isEnabled) {
            if (bluetoothAdapter!!.disable()) "Bluetooth disabling initiated."
            else throw Exception("Failed to disable Bluetooth.")
        } else "Bluetooth is already disabled."
    }

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

    // ------------------------- Broadcasting (with adjustable modes) -------------------------
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun broadcastBeacon(
        uuid: String,
        major: Int,
        minor: Int,
        advertiseMode: Int,
        txPowerLevel: Int
    ): String = withContext(Dispatchers.IO) {
        if (bluetoothAdapter == null) throw Exception("Device does not support Bluetooth.")
        if (!bluetoothAdapter!!.isEnabled) throw Exception("Bluetooth is disabled.")
        bluetoothLeAdvertiser = bluetoothAdapter!!.bluetoothLeAdvertiser
        if (bluetoothLeAdvertiser == null) throw Exception("BluetoothLeAdvertiser is unavailable.")

        advertiserMap[uuid]?.let { existingCallback ->
            bluetoothLeAdvertiser?.stopAdvertising(existingCallback)
            advertiserMap.remove(uuid)
            Log.i(TAG, "Stopped existing advertising for UUID: $uuid")
        }

        // Print what advertise mode and tx power level are being used. Print the name based on the value.
        val modeName = when (advertiseMode) {
            AdvertiseSettings.ADVERTISE_MODE_LOW_POWER -> "Low Power"
            AdvertiseSettings.ADVERTISE_MODE_BALANCED -> "Balanced"
            AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY -> "Low Latency"
            else -> "Unknown"
        }

        val powerName = when (txPowerLevel) {
            AdvertiseSettings.ADVERTISE_TX_POWER_ULTRA_LOW -> "Ultra Low"
            AdvertiseSettings.ADVERTISE_TX_POWER_LOW -> "Low"
            AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM -> "Medium"
            AdvertiseSettings.ADVERTISE_TX_POWER_HIGH -> "High"
            else -> "Unknown"
        }

        Log.i(TAG, "Starting advertising for UUID: $uuid with mode: $modeName and power: $powerName")

        val advertiseSettings = AdvertiseSettings.Builder()
            .setAdvertiseMode(advertiseMode) // Use UI-provided advertise mode
            .setTxPowerLevel(txPowerLevel)     // Use UI-provided TX power level
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
                Log.e(TAG, "Advertising failed for UUID: $uuid: $errorMessage")
            }
        }
        bluetoothLeAdvertiser!!.startAdvertising(advertiseSettings, advertiseData, callback)
        advertiserMap[uuid] = callback
        Log.i(TAG, "Started advertising for UUID: $uuid")
        "Advertising started for UUID: $uuid"
    }

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

    private fun buildAdvertiseData(uuid: String, major: Int, minor: Int): AdvertiseData {
        val uuidBytes = uuidToBytes(uuid)
        val majorBytes = intToByteArray(major)
        val minorBytes = intToByteArray(minor)
        val txPower: Byte = 0xC7.toByte() // default TX value
        val manufacturerData = ByteArray(23).apply {
            this[0] = 0x02
            this[1] = 0x15
            System.arraycopy(uuidBytes, 0, this, 2, uuidBytes.size)
            System.arraycopy(majorBytes, 0, this, 18, majorBytes.size)
            System.arraycopy(minorBytes, 0, this, 20, minorBytes.size)
            this[22] = txPower
        }
        return AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addManufacturerData(companyId, manufacturerData)
            .build()
    }

    private fun uuidToBytes(uuid: String): ByteArray {
        val parsedUUID = UUID.fromString(uuid)
        val byteBuffer = ByteBuffer.wrap(ByteArray(16))
        byteBuffer.putLong(parsedUUID.mostSignificantBits)
        byteBuffer.putLong(parsedUUID.leastSignificantBits)
        return byteBuffer.array()
    }

    private fun intToByteArray(value: Int): ByteArray {
        return byteArrayOf(
            ((value shr 8) and 0xFF).toByte(),
            (value and 0xFF).toByte()
        )
    }

    // ------------------------- AltBeacon Scanning -------------------------
    private suspend fun startAltBeaconScanning(uuid: String) = withContext(Dispatchers.Main) {
        if (isAltBeaconScanning) {
            Log.w(TAG, "Already scanning via AltBeacon.")
            throw Exception("Already scanning.")
        }
        if (bluetoothAdapter == null || (bluetoothAdapter?.isEnabled != true)) {
            throw Exception("Bluetooth is disabled or unavailable.")
        }
        scanUUID = uuid.uppercase(Locale.ROOT)
        Log.i(TAG, "startAltBeaconScanning: $scanUUID")

        if (beaconManager == null) {
            beaconManager = BeaconManager.getInstanceForApplication(appContext.reactContext!!)
            BeaconManager.setDebug(true)
            beaconManager!!.beaconParsers.clear()
            val parser = BeaconParser().setBeaconLayout("m:2-3=0215,i:4-19,i:20-21,i:22-23,p:24-24")
            parser.setHardwareAssistManufacturerCodes(arrayOf(0x004c).toIntArray())
            beaconManager!!.getBeaconParsers().add(parser)
            beaconManager!!.setEnableScheduledScanJobs(false)
            beaconManager!!.foregroundScanPeriod = 1100L
            beaconManager!!.foregroundBetweenScanPeriod = 0L
        }
        region = if (!scanUUID.isNullOrEmpty() && scanUUID != "00000000-0000-0000-0000-000000000000")
            Region("all-beacons", Identifier.parse(scanUUID), null, null)
        else Region("all-beacons", null, null, null)

        beaconManager!!.bind(this@BLEBeaconManager)
    }

    private suspend fun stopAltBeaconScanning() = withContext(Dispatchers.Main) {
        if (!isAltBeaconScanning) {
            Log.w(TAG, "Not currently scanning via AltBeacon.")
            return@withContext
        }
        try {
            region?.let { beaconManager?.stopRangingBeaconsInRegion(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping ranging: ${e.message}", e)
        }
        beaconManager?.unbind(this@BLEBeaconManager)
        isAltBeaconScanning = false
        Log.i(TAG, "Stopped AltBeacon scanning.")
    }

    override fun onBeaconServiceConnect() {
        Log.i(TAG, "AltBeacon onBeaconServiceConnect triggered.")
        beaconManager?.addRangeNotifier { beacons, _ ->
            if (beacons.isNotEmpty()) {
                for (beacon in beacons) {
                    val uuidStr = beacon.id1.toString().uppercase(Locale.ROOT)
                    val major = beacon.id2.toInt()
                    val minor = beacon.id3.toInt()
                    val rssi = beacon.rssi
                    val timeStamp = System.currentTimeMillis()
                    Log.d(TAG, "Detected AltBeacon: $uuidStr, $major, $minor, $rssi")
                    val currentScanUUID = scanUUID
                    if (currentScanUUID.isNullOrEmpty() ||
                        currentScanUUID == "00000000-0000-0000-0000-000000000000" ||
                        uuidStr == currentScanUUID) {
                        handleDetectedIBeacon(uuidStr, major, minor, rssi, timeStamp)
                    }
                }
            }
        }
        try {
            region?.let {
                beaconManager?.startRangingBeaconsInRegion(it)
                isAltBeaconScanning = true
                Log.i(TAG, "startRangingBeaconsInRegion: $it")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting region ranging: ${e.message}", e)
        }
    }

    private fun handleDetectedIBeacon(uuid: String, major: Int, minor: Int, rssi: Int, timestamp: Long) {
        val foundBeacon = Beacon(uuid, major, minor, rssi, timestamp)
        synchronized(detectedBeacons) {
            val index = detectedBeacons.indexOfFirst { it.uuid == uuid && it.major == major && it.minor == minor }
            if (index != -1) {
                detectedBeacons[index] = foundBeacon
            } else {
                Log.i(TAG, "Detected iBeacon via AltBeacon: $foundBeacon")
                sendEvent(
                    BEACON_DETECTED_EVENT,
                    bundleOf("uuid" to foundBeacon.uuid, "major" to foundBeacon.major, "minor" to foundBeacon.minor, "timestamp" to foundBeacon.timestamp)
                )
                detectedBeacons.add(foundBeacon)
            }
        }
    }

    // ------------------------- BluetoothLeScanner Scanning -------------------------
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun startBluetoothLeScannerListening(uuid: String) = withContext(Dispatchers.IO) {
        if (isBluetoothLeScannerScanning) {
            Log.w(TAG, "Already scanning via BluetoothLeScanner.")
            throw Exception("Already scanning.")
        }
        if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
            throw Exception("Bluetooth is disabled or unavailable.")
        }
        bluetoothLeScanner = bluetoothAdapter!!.bluetoothLeScanner
        if (bluetoothLeScanner == null) {
            throw Exception("BluetoothLeScanner is unavailable.")
        }
        scanUUID = uuid.uppercase(Locale.ROOT)
        // Here we filter for iBeacon advertisements using the manufacturer data prefix.
        val beaconPrefix = byteArrayOf(0x02, 0x15)
        val filter = ScanFilter.Builder()
            .setManufacturerData(companyId, beaconPrefix, byteArrayOf(0xFF.toByte(), 0xFF.toByte()))
            .build()
        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()
        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                handleScanResult(result)
            }
            override fun onBatchScanResults(results: List<ScanResult>) {
                results.forEach { handleScanResult(it) }
            }
            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "BLE Scan failed with error code $errorCode")
            }
        }
        bluetoothLeScanner!!.startScan(listOf(filter), scanSettings, scanCallback!!)
        isBluetoothLeScannerScanning = true
        Log.i(TAG, "Started scanning via BluetoothLeScanner for UUID: $uuid")
    }

    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun stopBluetoothLeScannerListening() = withContext(Dispatchers.IO) {
        if (!isBluetoothLeScannerScanning) {
            Log.w(TAG, "Not currently scanning via BluetoothLeScanner.")
            return@withContext
        }
        bluetoothLeScanner?.stopScan(scanCallback)
        scanCallback = null
        isBluetoothLeScannerScanning = false
        Log.i(TAG, "Stopped scanning via BluetoothLeScanner.")
    }

    // Helper: Parse iBeacon advertisement from ScanRecord.
    private fun parseIBeacon(scanRecord: ScanRecord, rssi: Int): Beacon? {
        val manufacturerData = scanRecord.getManufacturerSpecificData(companyId) ?: return null
        if (manufacturerData.size < 23) return null
        if (manufacturerData[0].toInt() != 0x02 || manufacturerData[1].toInt() != 0x15) return null
        val uuidBytes = manufacturerData.copyOfRange(2, 18)
        val uuid = bytesToUuid(uuidBytes) ?: return null
        val major = ((manufacturerData[18].toInt() and 0xFF) shl 8) or (manufacturerData[19].toInt() and 0xFF)
        val minor = ((manufacturerData[20].toInt() and 0xFF) shl 8) or (manufacturerData[21].toInt() and 0xFF)
        val timestamp = System.currentTimeMillis()
        return Beacon(uuid.toString(), major, minor, rssi, timestamp)
    }

    private fun bytesToUuid(bytes: ByteArray): UUID? {
        return try {
            val byteBuffer = ByteBuffer.wrap(bytes)
            val high = byteBuffer.long
            val low = byteBuffer.long
            UUID(high, low)
        } catch (e: Exception) {
            Log.e(TAG, "Error converting bytes to UUID: ${e.message}")
            null
        }
    }

    // Handle scan results from BluetoothLeScanner.
    private fun handleScanResult(result: ScanResult) {
        val scanRecord = result.scanRecord ?: return
        val beacon = parseIBeacon(scanRecord, result.rssi) ?: return
        if (scanUUID.isNullOrEmpty() || beacon.uuid.equals(scanUUID, ignoreCase = true)) {
            synchronized(detectedBeacons) {
                val index = detectedBeacons.indexOfFirst { it.uuid == beacon.uuid && it.major == beacon.major && it.minor == beacon.minor }
                if (index != -1) {
                    detectedBeacons[index] = beacon
                } else {
                    Log.i(TAG, "Detected beacon via BluetoothLeScanner: $beacon")
                    sendEvent(BEACON_DETECTED_EVENT, bundleOf("uuid" to beacon.uuid, "major" to beacon.major, "minor" to beacon.minor, "timestamp" to beacon.timestamp))
                    detectedBeacons.add(beacon)
                }
            }
        }
    }

    // ------------------------- BeaconConsumer Interface -------------------------
    override fun getApplicationContext(): Context {
        return appContext.reactContext!!
    }

    override fun bindService(intent: Intent?, conn: ServiceConnection, flags: Int): Boolean {
        if (intent == null) {
            Log.e(TAG, "bindService called with null Intent!")
            return false
        }
        return appContext.reactContext!!.bindService(intent, conn, flags)
    }

    override fun unbindService(conn: ServiceConnection) {
        appContext.reactContext!!.unbindService(conn)
    }

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