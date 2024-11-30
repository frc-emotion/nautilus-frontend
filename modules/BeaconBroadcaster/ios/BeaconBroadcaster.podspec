Pod::Spec.new do |spec|
    spec.name         = 'BeaconBroadcaster'
    spec.version      = '1.0.0'
    spec.summary      = 'Custom beacon broadcaster for React Native (Expo).'
    spec.homepage     = 'github.com/arshansgithub'
    spec.license      = 'MIT'
    spec.author       = { 'Arshan S' => 'arshan@arshan.dev' }
    spec.platform     = :ios, '13.0'
    spec.source       = { :path => '.' }
  
    spec.frameworks   = ['CoreBluetooth', 'CoreLocation']
  
    spec.dependency 'React-Core'
  
    spec.source_files = 'BeaconBroadcaster.swift', 'BeaconBroadcasterBridge.m'
  end