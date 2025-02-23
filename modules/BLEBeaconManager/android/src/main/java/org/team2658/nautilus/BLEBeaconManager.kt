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

// BLEBeaconManager Module
// Implement BeaconConsumer so we can use AltBeacon callbacks
class BLEBeaconManager : Module(), BeaconConsumer {

    private val TAG = "BLEBeaconManager"

    // Apple’s company ID (0x004C) for iBeacon
    private val companyId: Int = 0x004C

    // System BLE references (used for iBeacon broadcasting only)
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null

    // Maps to manage advertisers/callbacks
    private val advertiserMap: MutableMap<String, AdvertiseCallback> = ConcurrentHashMap()

    // AltBeacon references
    private var beaconManager: BeaconManager? = null
    private var region: Region? = null
    private var isAltBeaconScanning = false

    // The "UUID we care about" (or all if empty)
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

        Events(BEACON_DETECTED_EVENT, BLUETOOTH_CHANGE_EVENT)

        // --- Exposed JS/TS Functions ---

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

        // Start iBeacon scanning with AltBeacon
        AsyncFunction("startListening") { uuid: String, _mode: Int ->
            runBlocking {
                startAltBeaconScanning(uuid)
            }
        }

        // Stop iBeacon scanning
        AsyncFunction("stopListening") {
            runBlocking {
                stopAltBeaconScanning()
            }
        }

        AsyncFunction("getDetectedBeacons") {
            runBlocking {
                getDetectedBeacons()
            }
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

        OnCreate {
            initializeBluetooth()
        }

        OnDestroy {
            // Clean up
            appContext.reactContext?.unregisterReceiver(bluetoothStateReceiver)
            runBlocking {
                stopAllBroadcasts()
                stopAltBeaconScanning()
            }
        }
    }

    // ----------------------------------------------------------------------------
    //                       Initialize Bluetooth / State Receiver
    // ----------------------------------------------------------------------------

    private fun initializeBluetooth() {
        val manager = appContext.reactContext
            ?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        if (bluetoothAdapter == null) {
            Log.e(TAG, "Bluetooth adapter is null. Device may not support Bluetooth.")
            sendEvent(BLUETOOTH_CHANGE_EVENT, mapOf("state" to "unsupported"))
            return
        }

        // Register BT state receiver
        val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
        appContext.reactContext?.registerReceiver(bluetoothStateReceiver, filter)

        // Emit current Bluetooth state
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
        if (bluetoothAdapter == null) {
            throw Exception("Bluetooth adapter not available.")
        }
        if (!bluetoothAdapter!!.isEnabled) {
            if (bluetoothAdapter!!.enable()) {
                "Bluetooth enabling initiated."
            } else {
                throw Exception("Failed to enable Bluetooth.")
            }
        } else {
            "Bluetooth is already enabled."
        }
    }

    private suspend fun disableBluetooth(): String = withContext(Dispatchers.Main) {
        if (bluetoothAdapter == null) {
            throw Exception("Bluetooth adapter not available.")
        }
        if (bluetoothAdapter!!.isEnabled) {
            if (bluetoothAdapter!!.disable()) {
                "Bluetooth disabling initiated."
            } else {
                throw Exception("Failed to disable Bluetooth.")
            }
        } else {
            "Bluetooth is already disabled."
        }
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

    // ----------------------------------------------------------------------------
    //                         iBeacon BROADCASTING
    // ----------------------------------------------------------------------------
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private suspend fun broadcastBeacon(uuid: String, major: Int, minor: Int): String =
        withContext(Dispatchers.IO) {
            if (bluetoothAdapter == null) {
                throw Exception("Device does not support Bluetooth.")
            }
            if (!bluetoothAdapter!!.isEnabled) {
                throw Exception("Bluetooth is disabled.")
            }

            bluetoothLeAdvertiser = bluetoothAdapter!!.bluetoothLeAdvertiser
            if (bluetoothLeAdvertiser == null) {
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
                        AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED ->
                            "Advertising already started."
                        AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "Data too large."
                        AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS ->
                            "Too many advertisers."
                        AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal error."
                        AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED ->
                            "Feature unsupported."
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

    private fun buildAdvertiseData(uuid: String, major: Int, minor: Int): AdvertiseData {
        val uuidBytes = uuidToBytes(uuid)
        val majorBytes = intToByteArray(major)
        val minorBytes = intToByteArray(minor)
        val txPower: Byte = 0xC7.toByte() // just a default
        // 23-byte iBeacon manufacturer data
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

    // ----------------------------------------------------------------------------
    //                          ALTBEACON SCANNING
    // ----------------------------------------------------------------------------

    /**
     * Start scanning for iBeacons using the Android Beacon Library (AltBeacon).
     * @param uuid The specific Proximity UUID to filter on. If null or empty => detect all iBeacons.
     */
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

        // If not initialized, do so.
        if (beaconManager == null) {
            beaconManager = BeaconManager.getInstanceForApplication(appContext.reactContext!!)

            BeaconManager.setDebug(true)

            // Clear default layouts if you only want iBeacons. If you want multi-protocol, remove clear().
            beaconManager!!.beaconParsers.clear()

            val parser = BeaconParser().setBeaconLayout("m:2-3=0215,i:4-19,i:20-21,i:22-23,p:24-24")
            parser.setHardwareAssistManufacturerCodes(arrayOf(0x004c).toIntArray())

            beaconManager!!.getBeaconParsers().add(parser)

            // If you want real-time scanning in the foreground, disable jobs:
            beaconManager!!.setEnableScheduledScanJobs(false)

            // Set short scan intervals in the foreground
            beaconManager!!.foregroundScanPeriod = 1100L
            beaconManager!!.foregroundBetweenScanPeriod = 0L

            // If you want to run scanning in the background continuously on Android 8+,
            // you must do a foreground service. For example:
            // enableForegroundService()
        }

        // Build region with the provided UUID or wildcard
        val localScanUUID = scanUUID
        region = if (!localScanUUID.isNullOrEmpty() &&
            localScanUUID != "00000000-0000-0000-0000-000000000000"
        ) {
            Region("all-beacons", Identifier.parse(localScanUUID), null, null)
        } else {
            // detect all iBeacons
            Region("all-beacons", null, null, null)
        }

        // Bind so onBeaconServiceConnect() is called
        beaconManager!!.bind(this@BLEBeaconManager)
    }

    /**
     * (Optional) If you want a foreground service for scanning in background on Android 8+.
     */
    private fun enableForegroundService() {
        // Build a persistent notification
        val channelId = "BeaconReferenceChannel"
        val channelName = "Beacon Scanning"
        val nm = appContext.reactContext!!.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
            nm.createNotificationChannel(channel)
        }

        val builder = NotificationCompat.Builder(appContext.reactContext!!, channelId)
            .setSmallIcon(android.R.drawable.ic_menu_search)
            .setContentTitle("Scanning for iBeacons")
            .setContentText("Background scanning active")

        // Start foreground scanning
        beaconManager?.enableForegroundServiceScanning(builder.build(), 456)
    }

    private suspend fun stopAltBeaconScanning() = withContext(Dispatchers.Main) {
        if (!isAltBeaconScanning) {
            Log.w(TAG, "Not currently scanning via AltBeacon.")
            return@withContext
        }
        try {
            region?.let { r ->
                beaconManager?.stopRangingBeaconsInRegion(r)
            }
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

                    // Copy scanUUID so it doesn't change mid-loop
                    val currentScanUUID = scanUUID
                    if (
                        currentScanUUID.isNullOrEmpty() ||
                        currentScanUUID == "00000000-0000-0000-0000-000000000000" ||
                        uuidStr == currentScanUUID
                    ) {
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

    private fun handleDetectedIBeacon(
        uuid: String,
        major: Int,
        minor: Int,
        rssi: Int,
        timestamp: Long
    ) {
        val foundBeacon = Beacon(uuid, major, minor, rssi, timestamp)
        synchronized(detectedBeacons) {
            val index = detectedBeacons.indexOfFirst {
                it.uuid == uuid && it.major == major && it.minor == minor
            }
            if (index != -1) {
                detectedBeacons[index] = foundBeacon
            } else {
                Log.i(TAG, "Detected iBeacon via AltBeacon: $foundBeacon")
                sendEvent(
                    BEACON_DETECTED_EVENT,
                    bundleOf(
                        "uuid" to foundBeacon.uuid,
                        "major" to foundBeacon.major,
                        "minor" to foundBeacon.minor,
                        "timestamp" to foundBeacon.timestamp
                    )
                )
                detectedBeacons.add(foundBeacon)
            }
        }
    }

    // BeaconConsumer interface
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

    /**
     * Returns the list of detected beacons (now detected by AltBeacon).
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