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

    override init() {
        super.init()
        locationManager.delegate = self
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil, options: nil)
    }
  
  @objc func getDetectedBeacons(_ resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
      print("Fetching detected beacons:", detectedBeacons)
      resolver(detectedBeacons)
  }

    @objc func startBroadcasting(
        _ uuidString: String,
        major: NSNumber,
        minor: NSNumber,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let uuid = UUID(uuidString: uuidString) else {
            rejecter("invalid_uuid", "Invalid UUID format", nil)
            return
        }

        let bundleURL = Bundle.main.bundleIdentifier!
        let constraint = CLBeaconIdentityConstraint(uuid: uuid, major: major.uint16Value, minor: minor.uint16Value)
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: bundleURL)

        guard let beaconData = beaconRegion?.peripheralData(withMeasuredPower: nil) as? [String: Any] else {
            rejecter("beacon_data_error", "Could not create beacon data", nil)
            return
        }

        // Store the beacon data temporarily
        pendingBeaconData = beaconData

        // Only start advertising if the peripheral is powered on
        if peripheralManager?.state == .poweredOn {
            peripheralManager?.startAdvertising(beaconData)
            resolver("Beacon broadcasting started successfully")
        } else {
            // Wait until Bluetooth is powered on
            print("Bluetooth is not powered on. Waiting for it to turn on.")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                // We might delay the resolver until the state is powered on
                resolver("Beacon broadcasting will start once Bluetooth is powered on")
            }
        }
    }

    @objc func stopBroadcasting(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        if let manager = peripheralManager, manager.isAdvertising {
            manager.stopAdvertising()
            resolver("Beacon broadcasting stopped")
        } else {
            rejecter("not_broadcasting", "No active beacon broadcast to stop", nil)
        }
    }

  @objc func startListening(
      _ uuidString: String,
      resolver: @escaping RCTPromiseResolveBlock,
      rejecter: @escaping RCTPromiseRejectBlock
  ) {
      locationManager.requestWhenInUseAuthorization()

      guard let uuid = UUID(uuidString: uuidString) else {
          rejecter("invalid_uuid", "Invalid UUID format", nil)
          return
      }

      let constraint = CLBeaconIdentityConstraint(uuid: uuid)
      beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: uuid.uuidString) // Set the class-level property here
      locationManager.startMonitoring(for: beaconRegion!)
      locationManager.startRangingBeacons(satisfying: constraint)

      resolver("Beacon listening started")
  }

    @objc func stopListening(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        if let beaconRegion = beaconRegion {
            locationManager.stopMonitoring(for: beaconRegion)
            locationManager.stopRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
            resolver("Beacon listening stopped")
        } else {
            rejecter("not_listening", "No active beacon listening to stop", nil)
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension BeaconBroadcaster: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didRange beacons: [CLBeacon], satisfying constraint: CLBeaconIdentityConstraint) {
        detectedBeacons.removeAll()
        for beacon in beacons {
            let beaconData: [String: Any] = [
                "uuid": beacon.uuid.uuidString,
                "major": beacon.major,
                "minor": beacon.minor
            ]
            detectedBeacons.append(beaconData)
        }

    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        if region is CLBeaconRegion {
            locationManager.startRangingBeacons(satisfying: (region as! CLBeaconRegion).beaconIdentityConstraint)
        }
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        if region is CLBeaconRegion {
            locationManager.stopRangingBeacons(satisfying: (region as! CLBeaconRegion).beaconIdentityConstraint)
        }
    }
}

// MARK: - CBPeripheralManagerDelegate

extension BeaconBroadcaster: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        switch peripheral.state {
        case .poweredOn:
            print("Bluetooth is powered on")
            // If there's pending beacon data, start broadcasting
            if let beaconData = pendingBeaconData {
                peripheralManager?.startAdvertising(beaconData)
                pendingBeaconData = nil  // Clear after starting advertising
            }
        case .poweredOff:
            print("Bluetooth is powered off")
        case .resetting:
            print("Bluetooth is resetting")
        case .unauthorized:
            print("Bluetooth unauthorized")
        case .unsupported:
            print("Bluetooth unsupported on this device")
        case .unknown:
            print("Bluetooth state unknown")
        @unknown default:
            print("Bluetooth state unknown (future case)")
        }
    }
}
