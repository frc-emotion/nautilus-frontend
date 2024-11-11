//
//  BeaconBroadcaster.swift
//  nautilus
//
//  Created by Arshan S on 10/30/24.
//

import Foundation
import CoreBluetooth
import CoreLocation
import React

@objc(BeaconBroadcaster)
class BeaconBroadcaster: NSObject {
    private var peripheralManager: CBPeripheralManager?
    private var beaconRegion: CLBeaconRegion?
    private var locationManager = CLLocationManager()
    private var detectedBeacons = [[String: Any]]()
    private var pendingBeaconData: [String: Any]?
    
    private let DEBUG_PREFIX = "[BeaconBroadcaster]"

    override init() {
        super.init()
        print("\(DEBUG_PREFIX) Initializing BeaconBroadcaster.")
        
        locationManager.delegate = self
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil, options: nil)
    }
  
    @objc func getDetectedBeacons(_ resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
        print("\(DEBUG_PREFIX) Fetching detected beacons: \(detectedBeacons)")
        resolver(detectedBeacons)
    }

    @objc func startBroadcasting(
        _ uuidString: String,
        major: NSNumber,
        minor: NSNumber,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
      
      // Check if bluetooth is not powered on, error
      if peripheralManager?.state != .poweredOn {
        print("\(DEBUG_PREFIX) Bluetooth is not powered on.")
        rejecter("bluetooth_not_powered_on", "Bluetooth is not powered on", nil)
        return
      }
        
      
        print("\(DEBUG_PREFIX) Attempting to start broadcasting with UUID: \(uuidString), Major: \(major), Minor: \(minor)")

        guard let uuid = UUID(uuidString: uuidString) else {
            print("\(DEBUG_PREFIX) Invalid UUID format")
            rejecter("invalid_uuid", "Invalid UUID format", nil)
            return
        }

        let bundleURL = Bundle.main.bundleIdentifier!
        let constraint = CLBeaconIdentityConstraint(uuid: uuid, major: major.uint16Value, minor: minor.uint16Value)
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: bundleURL)

        guard let beaconData = beaconRegion?.peripheralData(withMeasuredPower: nil) as? [String: Any] else {
            print("\(DEBUG_PREFIX) Could not create beacon data")
            rejecter("beacon_data_error", "Could not create beacon data", nil)
            return
        }

        pendingBeaconData = beaconData
        print("\(DEBUG_PREFIX) Beacon data created.")

        if peripheralManager?.state == .poweredOn {
            peripheralManager?.startAdvertising(beaconData)
          print("\(DEBUG_PREFIX) isAdvertising after startAdvertising: \(peripheralManager?.isAdvertising ?? false)")
            resolver("Beacon broadcasting started successfully")
            print("\(DEBUG_PREFIX) Beacon broadcasting started successfully.")
        } else {
            print("\(DEBUG_PREFIX) Bluetooth is not powered on. Waiting to start advertising.")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                resolver("Beacon broadcasting will start once Bluetooth is powered on")
            }
        }
    }

    @objc func stopBroadcasting(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("\(DEBUG_PREFIX) Attempting to stop broadcasting.")
        if let manager = peripheralManager, manager.isAdvertising {
            manager.stopAdvertising()
            resolver("Beacon broadcasting stopped")
            print("\(DEBUG_PREFIX) Beacon broadcasting stopped.")
        } else {
            print("\(DEBUG_PREFIX) No active beacon broadcast to stop.")
            rejecter("not_broadcasting", "No active beacon broadcast to stop", nil)
        }
    }

    @objc func startListening(
        _ uuidString: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("\(DEBUG_PREFIX) Requesting location authorization and starting beacon listening for UUID: \(uuidString)")
        locationManager.requestWhenInUseAuthorization()

        guard let uuid = UUID(uuidString: uuidString) else {
            print("\(DEBUG_PREFIX) Invalid UUID format")
            rejecter("invalid_uuid", "Invalid UUID format", nil)
            return
        }

        let constraint = CLBeaconIdentityConstraint(uuid: uuid)
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: uuid.uuidString)
        
        locationManager.startMonitoring(for: beaconRegion!)
        locationManager.startRangingBeacons(satisfying: constraint)

        resolver("Beacon listening started")
        print("\(DEBUG_PREFIX) Beacon listening started.")
    }

    @objc func stopListening(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("\(DEBUG_PREFIX) Attempting to stop listening for beacons.")
        if let beaconRegion = beaconRegion {
            locationManager.stopMonitoring(for: beaconRegion)
            locationManager.stopRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
            resolver("Beacon listening stopped")
            print("\(DEBUG_PREFIX) Beacon listening stopped.")
        } else {
            print("\(DEBUG_PREFIX) No active beacon listening to stop.")
            rejecter("not_listening", "No active beacon listening to stop", nil)
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension BeaconBroadcaster: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didRange beacons: [CLBeacon], satisfying constraint: CLBeaconIdentityConstraint) {
        print("\(DEBUG_PREFIX) Ranging beacons: \(beacons.count) found.")
        
        detectedBeacons = beacons.map {
            [
                "uuid": $0.uuid.uuidString,
                "major": $0.major,
                "minor": $0.minor
            ]
        }
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        if let beaconRegion = region as? CLBeaconRegion {
            print("\(DEBUG_PREFIX) Entered beacon region: \(beaconRegion.identifier)")
            locationManager.startRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
        }
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        if let beaconRegion = region as? CLBeaconRegion {
            print("\(DEBUG_PREFIX) Exited beacon region: \(beaconRegion.identifier)")
            locationManager.stopRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
        }
    }
}

// MARK: - CBPeripheralManagerDelegate

extension BeaconBroadcaster: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        switch peripheral.state {
        case .poweredOn:
            print("\(DEBUG_PREFIX) Bluetooth is powered on.")
            if let beaconData = pendingBeaconData {
                peripheralManager?.startAdvertising(beaconData)
                pendingBeaconData = nil
                print("\(DEBUG_PREFIX) Started broadcasting pending beacon data.")
            }
        case .poweredOff:
            print("\(DEBUG_PREFIX) Bluetooth is powered off.")
        case .resetting:
            print("\(DEBUG_PREFIX) Bluetooth is resetting.")
        case .unauthorized:
            print("\(DEBUG_PREFIX) Bluetooth unauthorized.")
        case .unsupported:
            print("\(DEBUG_PREFIX) Bluetooth unsupported on this device.")
        case .unknown:
            print("\(DEBUG_PREFIX) Bluetooth state unknown.")
        @unknown default:
            print("\(DEBUG_PREFIX) Bluetooth state unknown (future case).")
        }
    }
}
