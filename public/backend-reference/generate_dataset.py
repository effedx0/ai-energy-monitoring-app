"""
EnerjiWatch - Sentetik Veri Seti Üretici
==========================================

Bu script, klima enerji tüketimi için gerçekçi sentetik veri seti üretir.
Python 3.8+ gerektirir, ek kütüphane gerekmez.

Kullanım:
    python generate_dataset.py
    python generate_dataset.py --hours 48 --output klima_48saat.csv
    python generate_dataset.py --anomaly-rate 0.05  # %5 anomali oranı
"""

import csv
import random
import math
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Tuple


class ACEnergySimulator:
    """Klima enerji tüketim simülatörü"""
    
    def __init__(
        self,
        btu: int = 12000,
        cop: float = 3.5,
        max_power_watts: int = 3500,
        target_temp: float = 24.0,
        electricity_price: float = 2.64  # TL/kWh
    ):
        self.btu = btu
        self.cop = cop
        self.max_power = max_power_watts
        self.target_temp = target_temp
        self.electricity_price = electricity_price
        
        # Durum değişkenleri
        self.current_temp = 28.0
        self.is_running = False
        self.compressor_load = 0
        self.total_energy = 0.0
        self.readings: List[Dict] = []
    
    def get_outdoor_temp(self, hour: int, base_temp: float = 32.0) -> float:
        """Günün saatine göre gerçekçi dış sıcaklık"""
        # Sıcaklık eğrisi (İstanbul yaz günü)
        temp_curve = [
            -4, -5, -5, -6, -5, -3, 0, 3, 5, 7, 8, 9,
            9, 10, 10, 9, 7, 5, 3, 1, 0, -1, -2, -3
        ]
        return base_temp + temp_curve[hour] + random.uniform(-1, 1)
    
    def calculate_indoor_temp_change(
        self, 
        outdoor_temp: float, 
        is_cooling: bool
    ) -> float:
        """İç sıcaklık değişimini hesapla"""
        # Dışarıdan ısı girişi
        heat_gain = (outdoor_temp - self.current_temp) * 0.02
        
        # Klima soğutma etkisi
        cooling = 0
        if is_cooling:
            # Kompresör yüküne göre soğutma gücü
            cooling_power = self.compressor_load / 100
            cooling = -0.15 * cooling_power - random.uniform(0, 0.05)
        
        # İç ısı kaynakları (insanlar, elektronik vb.)
        internal_heat = random.uniform(0, 0.02)
        
        return heat_gain + cooling + internal_heat
    
    def calculate_power(self) -> Tuple[float, bool]:
        """Anlık güç tüketimi ve anomali durumu"""
        is_anomaly = False
        
        if not self.is_running:
            # Bekleme modu: 50-80W
            base_power = 50 + random.uniform(0, 30)
        else:
            # Kompresör gücü
            compressor_power = (self.compressor_load / 100) * self.max_power * 0.85
            # Fan gücü
            fan_power = random.uniform(50, 150)
            # Elektronik
            electronics = 30
            
            base_power = compressor_power + fan_power + electronics
        
        # Normal gürültü (%5 varyasyon)
        noise = base_power * random.uniform(-0.05, 0.05)
        power = base_power + noise
        
        # Rastgele anomali ekleme (%2-5 olasılık)
        if random.random() < 0.03:
            # Ani güç artışı
            spike = random.uniform(1.3, 1.8)
            power *= spike
            is_anomaly = True
        
        # Sürekli yüksek anomali (%1 olasılık)
        if random.random() < 0.01:
            power *= random.uniform(1.2, 1.4)
            is_anomaly = True
        
        return max(0, power), is_anomaly
    
    def get_anomaly_type(self, power: float, recent_avg: float) -> str:
        """Anomali tipini belirle"""
        ratio = power / recent_avg if recent_avg > 0 else 1
        
        if ratio > 1.5:
            return 'spike'
        elif ratio > 1.3:
            return 'sustained_high'
        elif ratio < 0.5:
            return 'sudden_drop'
        else:
            return 'unusual_pattern'
    
    def simulate(
        self, 
        hours: int = 24, 
        interval_seconds: int = 60,
        base_outdoor_temp: float = 32.0
    ) -> List[Dict]:
        """Belirtilen süre için simülasyon çalıştır"""
        
        readings = []
        start_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Saniye bazında veri üretimi
        total_seconds = hours * 3600
        steps = total_seconds // interval_seconds
        
        recent_powers = []
        
        for step in range(steps):
            current_time = start_time + timedelta(seconds=step * interval_seconds)
            hour = current_time.hour + current_time.minute / 60
            
            # Dış sıcaklık
            outdoor_temp = self.get_outdoor_temp(int(hour), base_outdoor_temp)
            
            # Termostat kontrolü
            hysteresis = 1.0
            if self.current_temp > self.target_temp + hysteresis:
                self.is_running = True
            elif self.current_temp < self.target_temp - hysteresis:
                self.is_running = False
            
            # Gece modu (23:00 - 06:00)
            if (hour >= 23 or hour < 6) and self.current_temp < self.target_temp + 2:
                self.is_running = False
            
            # Kompresör yükü
            if self.is_running:
                temp_diff = abs(self.current_temp - self.target_temp)
                self.compressor_load = min(100, temp_diff * 25)
            else:
                self.compressor_load = 0
            
            # Sıcaklık güncelle
            temp_change = self.calculate_indoor_temp_change(outdoor_temp, self.is_running)
            self.current_temp += temp_change
            
            # Güç tüketimi
            power, is_anomaly = self.calculate_power()
            
            # Son güçleri takip et
            recent_powers.append(power)
            if len(recent_powers) > 60:
                recent_powers.pop(0)
            
            # Anomali tipi
            recent_avg = sum(recent_powers) / len(recent_powers) if recent_powers else power
            anomaly_type = self.get_anomaly_type(power, recent_avg) if is_anomaly else None
            
            # Elektrik değerleri
            voltage = 220 + random.uniform(-5, 5)
            current = power / voltage
            power_factor = 0.85 + random.uniform(0, 0.1)
            
            # Enerji hesabı (kWh)
            energy_kwh = (power / 1000) * (interval_seconds / 3600)
            self.total_energy += energy_kwh
            
            # Veri satırı
            reading = {
                'timestamp': current_time.strftime('%Y-%m-%d %H:%M:%S'),
                'device_id': 'ac-1',
                'device_type': 'ac',
                'power_watts': round(power, 2),
                'voltage': round(voltage, 1),
                'current_amps': round(current, 2),
                'power_factor': round(power_factor, 2),
                'indoor_temp': round(self.current_temp, 1),
                'outdoor_temp': round(outdoor_temp, 1),
                'is_running': self.is_running,
                'compressor_load': self.compressor_load,
                'is_anomaly': is_anomaly,
                'anomaly_type': anomaly_type,
                'cumulative_energy_kwh': round(self.total_energy, 4),
                'estimated_cost_tl': round(self.total_energy * self.electricity_price, 2)
            }
            
            readings.append(reading)
            self.readings.append(reading)
        
        return readings
    
    def export_csv(self, filename: str, readings: List[Dict] = None):
        """Veriyi CSV dosyasına aktar"""
        if readings is None:
            readings = self.readings
        
        if not readings:
            print("Uyarı: Aktarılacak veri yok!")
            return
        
        fieldnames = readings[0].keys()
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(readings)
        
        print(f"✓ {len(readings)} satır '{filename}' dosyasına kaydedildi.")
    
    def get_summary(self) -> Dict:
        """Özet istatistikler"""
        if not self.readings:
            return {}
        
        powers = [r['power_watts'] for r in self.readings]
        anomalies = [r for r in self.readings if r['is_anomaly']]
        
        return {
            'total_readings': len(self.readings),
            'total_hours': len(self.readings) / 60,  # 1 dakika aralıkla
            'total_energy_kwh': round(self.total_energy, 2),
            'estimated_cost_tl': round(self.total_energy * self.electricity_price, 2),
            'avg_power_watts': round(sum(powers) / len(powers), 2),
            'max_power_watts': round(max(powers), 2),
            'min_power_watts': round(min(powers), 2),
            'anomaly_count': len(anomalies),
            'anomaly_rate': f"{len(anomalies)/len(self.readings)*100:.1f}%"
        }


def generate_multi_device_dataset(
    hours: int = 24,
    interval: int = 60,
    output_file: str = 'enerjiwatch_dataset.csv'
):
    """Birden fazla cihaz için veri üret (gelecek için)"""
    
    devices = [
        {'id': 'ac-1', 'type': 'ac', 'name': 'Salon Kliması', 'btu': 12000, 'max_power': 3500},
        {'id': 'fridge-1', 'type': 'fridge', 'name': 'Buzdolabı', 'btu': 0, 'max_power': 150},
        {'id': 'washer-1', 'type': 'washer', 'name': 'Çamaşır Makinesi', 'btu': 0, 'max_power': 2000},
    ]
    
    all_readings = []
    
    for device in devices:
        if device['type'] == 'ac':
            simulator = ACEnergySimulator(
                btu=device['btu'],
                max_power_watts=device['max_power']
            )
            readings = simulator.simulate(hours=hours, interval_seconds=interval)
            
            for r in readings:
                r['device_id'] = device['id']
                r['device_name'] = device['name']
            
            all_readings.extend(readings)
    
    # CSV'ye yaz
    if all_readings:
        fieldnames = all_readings[0].keys()
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_readings)
        
        print(f"✓ Toplam {len(all_readings)} satır '{output_file}' dosyasına kaydedildi.")


def main():
    parser = argparse.ArgumentParser(
        description='EnerjiWatch Sentetik Veri Seti Üretici'
    )
    parser.add_argument(
        '--hours', 
        type=int, 
        default=24, 
        help='Simülasyon süresi (saat, varsayılan: 24)'
    )
    parser.add_argument(
        '--interval', 
        type=int, 
        default=60, 
        help='Ölçüm aralığı (saniye, varsayılan: 60)'
    )
    parser.add_argument(
        '--output', 
        type=str, 
        default='enerjiwatch_dataset.csv',
        help='Çıktı dosyası (varsayılan: enerjiwatch_dataset.csv)'
    )
    parser.add_argument(
        '--target-temp', 
        type=float, 
        default=24.0,
        help='Hedef sıcaklık (varsayılan: 24°C)'
    )
    parser.add_argument(
        '--outdoor-temp', 
        type=float, 
        default=32.0,
        help='Dış sıcaklık (varsayılan: 32°C)'
    )
    parser.add_argument(
        '--btu', 
        type=int, 
        default=12000,
        help='Klima BTU değeri (varsayılan: 12000)'
    )
    parser.add_argument(
        '--multi-device',
        action='store_true',
        help='Birden fazla cihaz için veri üret'
    )
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("EnerjiWatch Sentetik Veri Seti Üretici")
    print("=" * 50)
    print(f"\nParametreler:")
    print(f"  - Süre: {args.hours} saat")
    print(f"  - Aralık: {args.interval} saniye")
    print(f"  - Hedef sıcaklık: {args.target_temp}°C")
    print(f"  - Dış sıcaklık: {args.outdoor_temp}°C")
    print(f"  - BTU: {args.btu}")
    print(f"  - Çıktı: {args.output}")
    print()
    
    if args.multi_device:
        print("Çoklu cihaz modu...")
        generate_multi_device_dataset(
            hours=args.hours,
            interval=args.interval,
            output_file=args.output
        )
    else:
        # Tek cihaz (klima) simülasyonu
        simulator = ACEnergySimulator(
            btu=args.btu,
            target_temp=args.target_temp,
            max_power_watts=int(args.btu / 3412 * 1000)
        )
        
        print("Simülasyon çalışıyor...")
        readings = simulator.simulate(
            hours=args.hours,
            interval_seconds=args.interval,
            base_outdoor_temp=args.outdoor_temp
        )
        
        # CSV'ye aktar
        simulator.export_csv(args.output, readings)
        
        # Özet göster
        summary = simulator.get_summary()
        print("\n" + "=" * 50)
        print("ÖZET İSTATİSTİKLER")
        print("=" * 50)
        for key, value in summary.items():
            print(f"  {key}: {value}")
    
    print("\n✓ Tamamlandı!")


if __name__ == '__main__':
    main()
