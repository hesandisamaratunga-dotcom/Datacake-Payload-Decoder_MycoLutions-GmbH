function Decoder(payload, port) {
  // Milesight Gateway integration in Datacake passes bytes directly
  // OR wraps them in payload.bytes or payload.data
  var bytes;

  if (Array.isArray(payload)) {
    // Called with raw byte array
    bytes = payload;
  } else if (payload && typeof payload === 'object') {
    if (payload.bytes && Array.isArray(payload.bytes)) {
      bytes = payload.bytes;
    } else if (payload.data && typeof payload.data === 'string') {
      bytes = Array.from(Buffer.from(payload.data, 'base64'));
    } else {
      return {};
    }
  } else {
    return {};
  }

  function readUInt16LE(b, i) { return (b[i+1] << 8) + b[i]; }
  function readInt16LE(b, i)  { var v = readUInt16LE(b, i); return v > 0x7fff ? v - 0x10000 : v; }

  var decoded = {};
  var i = 0;
 
  while (i < bytes.length) {
    var ch  = bytes[i++];
    var typ = bytes[i++];
    if      (ch === 0x01 && typ === 0x75) { decoded.BATTERY     = bytes[i++]; }
    else if (ch === 0x03 && typ === 0x67) { decoded.TEMPERATURE = readInt16LE(bytes, i) / 10; i += 2; }
    else if (ch === 0x04 && typ === 0x68) { decoded.HUMIDITY    = bytes[i++] / 2; }
    else if (ch === 0x07 && typ === 0x7d) { decoded.CO2         = readUInt16LE(bytes, i); i += 2; }
    else { break; }
  }

  // LoRa signal — try Milesight Gateway's normalizedPayload format
  try {
    if (typeof normalizedPayload !== 'undefined') {
      decoded.LORA_RSSI = (normalizedPayload.gateways && normalizedPayload.gateways[0].rssi) || 0;
      decoded.LORA_SNR  = (normalizedPayload.gateways && normalizedPayload.gateways[0].snr)  || 0;
    }
  } catch(e) {}

  // Fallback: read from rxInfo if it's in the raw payload object
  if (!decoded.LORA_RSSI && payload && payload.rxInfo && payload.rxInfo.length) {
    decoded.LORA_RSSI = payload.rxInfo[0].rssi;
    decoded.LORA_SNR  = payload.rxInfo[0].loRaSNR;
  }

  return decoded;
}
