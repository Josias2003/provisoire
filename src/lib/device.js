const DEVICE_KEY = 'provisoire_device_id_v1'

/** A random per-browser ID, persisted in localStorage. Not tied to any
 * personal info - just lets the owner's private stats page group exam
 * results by "the same browser came back" without accounts or logins. */
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}
