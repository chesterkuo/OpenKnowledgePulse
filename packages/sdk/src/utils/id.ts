function uuid(): string {
  return crypto.randomUUID();
}

export function generateTraceId(): string {
  return `kp:trace:${uuid()}`;
}

export function generatePatternId(): string {
  return `kp:pattern:${uuid()}`;
}

export function generateSopId(): string {
  return `kp:sop:${uuid()}`;
}

export function generateSkillId(): string {
  return `kp:skill:${uuid()}`;
}
