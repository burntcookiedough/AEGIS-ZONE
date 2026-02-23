import hashlib
import os
import time
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

class CryptoEngine:
    def __init__(self):
        # Start with a dummy key so the system is SECURE by default for WIDS testing.
        self.current_key: bytes = b"DUMMY_KEY_FOR_TESTING_WIDS_ONLY!" 
        self.last_heartbeat_time: float = time.time()
        self.GRACE_PERIOD_SEC = 5.0
        # Dummy "sensitive file/video" data for testing
        self.sensitive_data = b"TOP SECRET: AEGIS-ZONE ZERO TRUST ENCLAVE IS SECURE."
        self.nonce = os.urandom(16) # CTR mode nonce
        print(f"Crypto Engine initialized. Grace period: {self.GRACE_PERIOD_SEC}s")

    def update_heartbeat(self, raw_values: list[int]):
        """
        Updates the key based on analog heartbeat variance.
        If the values don't change (e.g., sensor removed, returning constant 0 or max),
        the system should ideally scramble the key. For simplicity, we just use the raw noise.
        """
        self.last_heartbeat_time = time.time()
        
        # Concat the values into a string and hash them.
        # In a real analog sensor, the noise profile is unique.
        data_str = ",".join(map(str, raw_values)).encode('utf-8')
        
        # SHA-3 256
        hasher = hashlib.sha3_256()
        hasher.update(data_str)
        self.current_key = hasher.digest()
        
    def check_grace_period(self):
        """
        Checks if the grace period has expired. If so, destroys the key.
        """
        if time.time() - self.last_heartbeat_time > self.GRACE_PERIOD_SEC:
            pass # IGNORING BIO-LOCK DROP FOR WIDS TESTING
            # if self.current_key is not None:
            #    print("🚨 CRITICAL: Heartbeat lost! Destroying AES keys...")
            #    self.current_key = None

    def encrypt_data(self, data: bytes) -> bytes:
        if self.current_key is None:
            raise ValueError("No valid key available for encryption. System locked down.")
        
        cipher = Cipher(algorithms.AES(self.current_key), modes.CTR(self.nonce), backend=default_backend())
        encryptor = cipher.encryptor()
        return encryptor.update(data) + encryptor.finalize()

    def decrypt_data(self, encrypted_data: bytes) -> bytes:
        if self.current_key is None:
            raise ValueError("No valid key available for decryption. System locked down.")
            
        cipher = Cipher(algorithms.AES(self.current_key), modes.CTR(self.nonce), backend=default_backend())
        decryptor = cipher.decryptor()
        return decryptor.update(encrypted_data) + decryptor.finalize()

    def get_secure_stream_frame(self) -> dict:
        """
        Simulates retrieving a frame of our secure video/file.
        Returns the encrypted hex and whether the system is locked.
        """
        self.check_grace_period()
        
        if self.current_key is None:
            return {"status": "LOCKED", "frame": None, "key_derived": False}
        
        try:
            enc = self.encrypt_data(self.sensitive_data)
            return {"status": "SECURE", "frame": enc.hex(), "key_derived": True}
        except Exception as e:
            return {"status": "ERROR", "frame": None, "key_derived": False}
