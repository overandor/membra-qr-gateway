// Uses Web Crypto API (SubtleCrypto) for SHA-256

export async function computeSha256(data) {
  let buffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    buffer = data;
  } else {
    buffer = new TextEncoder().encode(JSON.stringify(data));
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyArtifactIntegrity(artifact) {
  if (!artifact) return { valid: false, error: 'No artifact provided' };

  const { hash, content, name, createdAt, creator } = artifact;

  if (!hash) return { valid: false, error: 'Artifact has no hash' };

  const canonical = JSON.stringify({
    name: name || null,
    content: content || null,
    createdAt: createdAt || null,
    creator: creator || null,
  });

  try {
    const computed = await computeSha256(canonical);
    const normalizedStored = hash.replace(/^0x/, '').toLowerCase();
    const isValid = computed === normalizedStored;
    return {
      valid: isValid,
      computedHash: computed,
      storedHash: normalizedStored,
      error: isValid ? null : 'Hash mismatch — artifact may have been tampered with',
    };
  } catch (err) {
    return { valid: false, error: `Hash computation failed: ${err.message}` };
  }
}

export async function verifyChainOfCustody(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { valid: false, error: 'No events provided' };
  }

  const issues = [];

  // Check events are ordered by timestamp
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    if (curr.timestamp < prev.timestamp) {
      issues.push(`Event ${i} has earlier timestamp than event ${i - 1}`);
    }
  }

  // Check each event has required fields
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev.type) issues.push(`Event ${i} missing type`);
    if (!ev.timestamp) issues.push(`Event ${i} missing timestamp`);
    if (!ev.actor && !ev.system) issues.push(`Event ${i} missing actor`);
  }

  // Check hash chaining: each event's prevHash should match previous event's hash
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    if (curr.prevHash && prev.hash) {
      const normalizedPrev = prev.hash.replace(/^0x/, '').toLowerCase();
      const normalizedCurr = curr.prevHash.replace(/^0x/, '').toLowerCase();
      if (normalizedPrev !== normalizedCurr) {
        issues.push(`Chain broken between event ${i - 1} and event ${i}: hash mismatch`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    eventCount: events.length,
  };
}

export default { computeSha256, verifyArtifactIntegrity, verifyChainOfCustody };
