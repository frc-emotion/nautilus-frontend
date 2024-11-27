package com.team2658

// INSPIRED BY: https://github.com/barakataboujreich/react-native-ble-advertise

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import androidx.annotation.RequiresApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer
import java.util.*
import java.util.concurrent.ConcurrentHashMap

data class Beacon(
    val uid: String,
    val major: Int,
    val minor: Int,
    val rssi: Int,
    val timestamp: Long
)

const val BEACON_DETECTED_EVENT = "BeaconDetected"

class BLEBeaconManager : Module() {

    private val TAG = "BLEBeaconManager"
    private var companyId: Int = 0x0000
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null

    // Maps to manage advertisers and their callbacks
    private val advertiserMap: MutableMap<String, BluetoothLeAdvertiser> = ConcurrentHashMap()
    private val advertiserCallbackMap: MutableMap<String, AdvertiseCallback> = ConcurrentHashMap()

    // Variables for scanning
    private var bluetoothLeScanner: BluetoothLeScanner? = null
    private var scanCallback: ScanCallback? = null
    private var isScanning: Boolean = false
    private var scanUUID: String? = null

    // Thread-safe list to store detected beacons
    private val detectedBeacons: MutableList<Beacon> = Collections.synchronizedList(mutableListOf())

    override fun definition() = ModuleDefinition {
        Name("BLEBeaconManager")

        Constants {
            mapOf(
                "ADVERTISE_MODE_BALANCED" to AdvertiseSettings.ADVERTISE_MODE_BALANCED,
                "ADVERTISE_MODE_LOW_LATENCY" to AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY,
                "ADVERTISE_MODE_LOW_POWER" to AdvertiseSettings.ADVERTISE_MODE_LOW_POWER,
                "ADVERTISE_TX_POWER_HIGH" to AdvertiseSettings.ADVERTISE_TX_POWER_HIGH,
                "ADVERTISE_TX_POWER_LOW" to AdvertiseSettings.ADVERTISE_TX_POWER_LOW,
                "ADVERTISE_TX_POWER_MEDIUM" to AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM,
                "ADVERTISE_TX_POWER_ULTRA_LOW" to AdvertiseSettings.ADVERTISE_TX_POWER_ULTRA_LOW
            )
        }

        Events(BEACON_DETECTED_EVENT)

        // Function to set the company ID
        Function("setCompanyId") { newCompanyId: Int ->
            companyId = newCompanyId
            Log.i(TAG, "Company ID set to $companyId")
        }

        // Async function to start broadcasting
        AsyncFunction("broadcast") { uid: String, major: Int, minor: Int ->
            return@AsyncFunction runBlocking { broadcastBeacon(uid, major, minor) }
        }

        // Async function to stop broadcasting
        AsyncFunction("stopBroadcast") {
            return@AsyncFunction runBlocking { stopAllBroadcasts() }
        }

        // Function to enable Bluetooth adapter
        Function("enableBluetooth") {
            enableBluetooth()
        }

        // Function to disable Bluetooth adapter
        Function("disableBluetooth") {
            disableBluetooth()
        }

        // Async function to check if BLE is supported
        AsyncFunction("checkIfBLESupported") {
            return@AsyncFunction runBlocking { checkIfBLESupported() }
        }

        // Function to start listening for beacons
        Function("startListening") { uuid: String ->
            startListening(uuid)
        }

        // Function to stop listening for beacons
        Function("stopListening") {
            stopListening()
        }

        // Async function to get detected beacons
        AsyncFunction("getDetectedBeacons") {
            return@AsyncFunction runBlocking { getDetectedBeacons() }
        }
    }

    /**
     * Enables the Bluetooth adapter if it's not already enabled.
     */
    private fun enableBluetooth() {
        bluetoothAdapter?.let { adapter ->
            if (!adapter.isEnabled) {
                adapter.enable()
                Log.i(TAG, "Bluetooth adapter enabled.")

                // Initialize advertiser if not already initialized
                if (bluetoothLeAdvertiser == null) {
                    bluetoothLeAdvertiser = adapter.bluetoothLeAdvertiser
                    Log.i(TAG, "BluetoothLeAdvertiser initialized.")
                } else {
                    Log.i(TAG, "BluetoothLeAdvertiser is already initialized.")
                }

            } else {
                Log.i(TAG, "Bluetooth adapter is already enabled.")
            }
        } ?: run {
            // Initialize Bluetooth adapter
            val bluetoothManager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            bluetoothAdapter = bluetoothManager?.adapter
            if (bluetoothAdapter == null) {
                Log.w(TAG, "Bluetooth adapter is null. Device may not support Bluetooth.")
                return
            }

            if (!bluetoothAdapter!!.isEnabled) {
                bluetoothAdapter!!.enable()
                Log.i(TAG, "Bluetooth adapter enabled.")
            } else {
                Log.i(TAG, "Bluetooth adapter is already enabled.")
            }

            // Initialize advertiser
            bluetoothLeAdvertiser = bluetoothAdapter!!.bluetoothLeAdvertiser
            if (bluetoothLeAdvertiser != null) {
                Log.i(TAG, "BluetoothLeAdvertiser initialized.")
            } else {
                Log.w(TAG, "BluetoothLeAdvertiser is unavailable on this device.")
            }
        }
    }

    /**
     * Disables the Bluetooth adapter if it's not already disabled.
     */
    private fun disableBluetooth() {
        bluetoothAdapter?.let { adapter ->
            if (adapter.isEnabled) {
                adapter.disable()
                Log.i(TAG, "Bluetooth adapter disabled.")
            } else {
                Log.i(TAG, "Bluetooth adapter is already disabled.")
            }
        } ?: run {
            Log.w(TAG, "Bluetooth adapter is null. Device may not support Bluetooth.")
        }
    }

    /**
     * Checks if BLE is supported on the device.
     * @return "80" if supported, "100" otherwise.
     */
    private suspend fun checkIfBLESupported(): String = withContext(Dispatchers.IO) {
        if (bluetoothAdapter != null && bluetoothAdapter!!.isMultipleAdvertisementSupported) {
            "80"
        } else {
            "100"
        }
    }

    /**
     * Starts broadcasting a BLE beacon with the specified UID, major, and minor values.
     * @param uid Unique Identifier for the beacon (UUID format).
     * @param major Major value of the beacon.
     * @param minor Minor value of the beacon.
     * @return Confirmation message upon successful broadcasting.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun broadcastBeacon(uid: String, major: Int, minor: Int): String = withContext(Dispatchers.IO) {
        try {
            if (bluetoothAdapter == null) {
                Log.w(TAG, "Device does not support Bluetooth. Adapter is null.")
                throw Exception("Device does not support Bluetooth. Adapter is null.")
            }

            if (companyId == 0x0000) {
                Log.w(TAG, "Invalid company ID.")
                throw Exception("Invalid company ID.")
            }

            if (!bluetoothAdapter!!.isEnabled) {
                Log.w(TAG, "Bluetooth is disabled.")
                throw Exception("Bluetooth is disabled.")
            }

            bluetoothLeAdvertiser = bluetoothAdapter!!.bluetoothLeAdvertiser

            if (bluetoothLeAdvertiser == null) {
                Log.w(TAG, "BluetoothLeAdvertiser is unavailable on this device.")
                throw Exception("BluetoothLeAdvertiser is unavailable on this device.")
            }

            // Stop existing advertising with the same UID if any
            advertiserMap[uid]?.let { existingAdvertiser ->
                advertiserCallbackMap[uid]?.let { existingCallback ->
                    existingAdvertiser.stopAdvertising(existingCallback)
                    advertiserMap.remove(uid)
                    advertiserCallbackMap.remove(uid)
                    Log.i(TAG, "Stopped existing advertising for UID: $uid")
                }
            }

            val majorBytes = intToByteArray(major)
            val minorBytes = intToByteArray(minor)

            val payload = byteArrayOf(
                majorBytes[0],
                majorBytes[1],
                minorBytes[0],
                minorBytes[1]
            )

            val settings = buildAdvertiseSettings()
            val data = buildAdvertiseData(uid, payload)

            val callback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
                    super.onStartSuccess(settingsInEffect)
                    Log.i(TAG, "Advertising started successfully with settings: $settingsInEffect")
                }

                override fun onStartFailure(errorCode: Int) {
                    super.onStartFailure(errorCode)
                    Log.e(TAG, "Advertising failed with error code: $errorCode")
                    // Note: Throwing an exception here won't propagate to the coroutine
                }
            }

            bluetoothLeAdvertiser!!.startAdvertising(settings, data, callback)
            advertiserMap[uid] = bluetoothLeAdvertiser!!
            advertiserCallbackMap[uid] = callback

            Log.i(TAG, "Started advertising with UID: $uid")
            "Advertising started successfully."
        } catch (e: Exception) {
            Log.e(TAG, "Error in broadcastBeacon: ${e.message}", e)
            throw e
        }
    }

    /**
     * Stops all ongoing BLE beacon broadcasts.
     * @return A list of UIDs that were stopped.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun stopAllBroadcasts(): List<String> = withContext(Dispatchers.IO) {
        try {
            val stoppedUids = mutableListOf<String>()
            val keys = advertiserMap.keys.toList()

            for (uid in keys) {
                advertiserMap[uid]?.let { advertiser ->
                    advertiserCallbackMap[uid]?.let { callback ->
                        advertiser.stopAdvertising(callback)
                        stoppedUids.add(uid)
                        Log.i(TAG, "Stopped advertising for UID: $uid")
                    }
                }
                advertiserMap.remove(uid)
                advertiserCallbackMap.remove(uid)
            }

            stoppedUids
        } catch (e: Exception) {
            Log.e(TAG, "Error in stopAllBroadcasts: ${e.message}", e)
            throw e
        }
    }

    /**
     * Builds the AdvertiseSettings for BLE broadcasting.
     * @return AdvertiseSettings instance.
     */
    private fun buildAdvertiseSettings(): AdvertiseSettings {
        return AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .build()
    }

    /**
     * Builds the AdvertiseData for BLE broadcasting.
     * @param uid UUID string.
     * @param payload Byte array containing major and minor values.
     * @return AdvertiseData instance.
     */
    private fun buildAdvertiseData(uid: String, payload: ByteArray): AdvertiseData {
        val uuid = UUID.fromString(uid)
        val uuidBytes = ByteBuffer.wrap(ByteArray(16))
            .putLong(uuid.mostSignificantBits)
            .putLong(uuid.leastSignificantBits)
            .array()

        val manufacturerData = ByteArray(24)
        manufacturerData[0] = 0x02 // Beacon Identifier
        manufacturerData[1] = 0x15 // Beacon Identifier

        // Adding the UUID
        System.arraycopy(uuidBytes, 0, manufacturerData, 2, uuidBytes.size)

        // Adding Major and Minor
        System.arraycopy(payload, 0, manufacturerData, 18, payload.size)

        // Tx Power (Example value)
        manufacturerData[22] = 0xC7.toByte()

        return AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addManufacturerData(companyId, manufacturerData)
            .build()
    }

    /**
     * Converts an integer to a byte array.
     * @param value Integer value.
     * @return Byte array.
     */
    private fun intToByteArray(value: Int): ByteArray {
        return byteArrayOf(
            (value shr 8 and 0xFF).toByte(),
            (value and 0xFF).toByte()
        )
    }

    /**
     * Starts listening for BLE beacons with the specified UUID.
     * @param uuid UUID string to listen for.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private fun startListening(uuid: String) {
        if (isScanning) {
            Log.w(TAG, "Already scanning.")
            return
        }

        bluetoothAdapter?.let { adapter ->
            if (!adapter.isEnabled) {
                Log.w(TAG, "Bluetooth is disabled. Cannot start scanning.")
                return
            }

            bluetoothLeScanner = adapter.bluetoothLeScanner
            if (bluetoothLeScanner == null) {
                Log.w(TAG, "BluetoothLeScanner is unavailable.")
                return
            }

            scanUUID = uuid

            val scanFilter = ScanFilter.Builder()
                .setServiceUuid(ParcelUuid.fromString(uuid))
                .build()

            val scanSettings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()

            scanCallback = object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult) {
                    super.onScanResult(callbackType, result)
                    handleScanResult(result)
                }

                override fun onBatchScanResults(results: List<ScanResult>) {
                    super.onBatchScanResults(results)
                    for (result in results) {
                        handleScanResult(result)
                    }
                }

                override fun onScanFailed(errorCode: Int) {
                    super.onScanFailed(errorCode)
                    Log.e(TAG, "BLE Scan failed with error code $errorCode")
                }
            }

            bluetoothLeScanner!!.startScan(listOf(scanFilter), scanSettings, scanCallback)
            isScanning = true
            Log.i(TAG, "Started BLE scanning for UUID: $uuid")
        } ?: run {
            Log.w(TAG, "Bluetooth adapter is null. Cannot start scanning.")
        }
    }

    /**
     * Stops listening for BLE beacons.
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private fun stopListening() {
        if (!isScanning) {
            Log.w(TAG, "Not currently scanning.")
            return
        }

        bluetoothLeScanner?.let { scanner ->
            scanCallback?.let { callback ->
                scanner.stopScan(callback)
                Log.i(TAG, "Stopped BLE scanning.")
            }
        }

        scanCallback = null
        scanUUID = null
        isScanning = false
    }

    /**
     * Handles a scan result and adds it to the detectedBeacons list if it matches the UUID.
     * @param result ScanResult object.
     */
    private fun handleScanResult(result: ScanResult) {
        val scanRecord = result.scanRecord ?: return

        val beaconData = parseBeacon(scanRecord.bytes, result.rssi)
        beaconData?.let { beacon ->
            // Check if UID matches
            if (beacon.uid.equals(scanUUID, ignoreCase = true)) {
                // Add to detectedBeacons
                synchronized(detectedBeacons) {
                    // Update if beacon already exists, else add
                    val existingBeacon = detectedBeacons.find { 
                        it.uid == beacon.uid && it.major == beacon.major && it.minor == beacon.minor 
                    }
                    if (existingBeacon != null) {
                        detectedBeacons.remove(existingBeacon)
                        detectedBeacons.add(beacon)
                    } else {
                        detectedBeacons.add(beacon)
                    }
                }
                Log.i(TAG, "Detected beacon: $beacon")
                // Convert Beacon to Map<String, Any?> before sending
                this@BLEBeaconManager.sendEvent(
                    BEACON_DETECTED_EVENT,
                    mapOf(
                        "uid" to beacon.uid,
                        "major" to beacon.major,
                        "minor" to beacon.minor,
                        "rssi" to beacon.rssi,
                        "timestamp" to beacon.timestamp
                    )
                )
            }
        }
    }

    /**
     * Parses the scan record bytes to extract beacon information.
     * Supports iBeacon format.
     * @param scanRecord Byte array of the scan record.
     * @param rssi RSSI value from the ScanResult.
     * @return Beacon object if parsing is successful, null otherwise.
     */
    private fun parseBeacon(scanRecord: ByteArray, rssi: Int): Beacon? {
        // iBeacon has specific structure:
        // Byte 0-1: Length and type
        // Byte 2-3: Manufacturer ID (0x004C for Apple)
        // Byte 4: Beacon type (0x02)
        // Byte 5: Beacon length (0x15)
        // Byte 6-21: UUID
        // Byte 22-23: Major
        // Byte 24-25: Minor
        // Byte 26: Tx power

        if (scanRecord.size < 30) {
            return null
        }

        // Check for iBeacon prefix
        if (scanRecord[0].toInt() != 0x02 || scanRecord[1].toInt() != 0x15) {
            return null
        }

        // Manufacturer specific data starts at index 2
        val manufacturerId = (scanRecord[4].toInt() and 0xFF) or ((scanRecord[5].toInt() and 0xFF) shl 8)
        if (manufacturerId != 0x004C) { // Apple company ID
            return null
        }

        // Extract UUID
        val uuidBytes = ByteArray(16)
        System.arraycopy(scanRecord, 6, uuidBytes, 0, 16)
        val uuid = ByteBuffer.wrap(uuidBytes).let {
            UUID(it.long, it.long)
        }

        // Extract Major and Minor
        val major = ((scanRecord[22].toInt() and 0xFF) shl 8) or (scanRecord[23].toInt() and 0xFF)
        val minor = ((scanRecord[24].toInt() and 0xFF) shl 8) or (scanRecord[25].toInt() and 0xFF)

        val timestamp = System.currentTimeMillis()

        return Beacon(
            uid = uuid.toString(),
            major = major,
            minor = minor,
            rssi = rssi, // Correct RSSI value
            timestamp = timestamp
        )
    }

    /**
     * Returns the list of detected beacons.
     * @return List of beacons as a list of maps.
     */
    private suspend fun getDetectedBeacons(): List<Map<String, Any>> = withContext(Dispatchers.IO) {
        synchronized(detectedBeacons) {
            detectedBeacons.map { beacon ->
                mapOf(
                    "uid" to beacon.uid,
                    "major" to beacon.major,
                    "minor" to beacon.minor,
                    "rssi" to beacon.rssi,
                    "timestamp" to beacon.timestamp
                )
            }
        }
    }
}
