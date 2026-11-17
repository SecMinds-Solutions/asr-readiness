// User-writable locations (CONTEXT.md): the one definition. A path is never a Suggested exclusion
// when ordinary users can create files there. To err on the safe side, every path counts as
// User-writable unless it is in a folder only administrators can write to by default: Program Files,
// or Windows outside its known user-writable subfolders. Drives other than C:, which may be
// removable, and network shares count as User-writable, and so does a path that is not absolute.

/** Folders only administrators can write to by default (lowercase, with a trailing backslash). */
const ADMIN_ONLY_FOLDERS = ['c:\\program files\\', 'c:\\program files (x86)\\', 'c:\\windows\\'];

/**
 * Subfolders of C:\Windows where ordinary users can create files by default (lowercase, with a
 * trailing backslash), as listed by application control guidance such as Microsoft's AppLocker
 * documentation and AaronLocker.
 */
const USER_WRITABLE_WINDOWS_FOLDERS = [
  'c:\\windows\\temp\\',
  'c:\\windows\\tasks\\',
  'c:\\windows\\tracing\\',
  'c:\\windows\\debug\\',
  'c:\\windows\\pla\\',
  'c:\\windows\\registration\\crmlog\\',
  'c:\\windows\\servicing\\packages\\',
  'c:\\windows\\servicing\\sessions\\',
  'c:\\windows\\system32\\tasks\\',
  'c:\\windows\\system32\\tasks_migrated\\',
  'c:\\windows\\system32\\com\\dmp\\',
  'c:\\windows\\system32\\fxstmp\\',
  'c:\\windows\\system32\\microsoft\\crypto\\rsa\\machinekeys\\',
  'c:\\windows\\system32\\spool\\drivers\\color\\',
  'c:\\windows\\system32\\spool\\printers\\',
  'c:\\windows\\system32\\spool\\servers\\',
  'c:\\windows\\syswow64\\tasks\\',
  'c:\\windows\\syswow64\\com\\dmp\\',
  'c:\\windows\\syswow64\\fxstmp\\',
  'c:\\windows\\syswow64\\microsoft\\crypto\\rsa\\machinekeys\\',
];

/**
 * Lowercase, with backslashes, without the `\\?\` long-path prefix, and with a trailing backslash so
 * that a folder matches its own entry. Other forms, such as `\Device\HarddiskVolume3\`, stay as they
 * are and so count as User-writable. A path with `..` or `.` segments is not trusted.
 */
const normalise = (path: string) => `${path.trim().replace(/\//g, '\\').toLowerCase().replace(/^\\\\\?\\/, '')}\\`;

export function isUserWritableLocation(path: string): boolean {
  const normalised = normalise(path);
  if (normalised.split('\\').some((segment) => segment === '..' || segment === '.')) return true;
  const inAdminOnly = ADMIN_ONLY_FOLDERS.some((folder) => normalised.startsWith(folder));
  const inWritableWindows = USER_WRITABLE_WINDOWS_FOLDERS.some((folder) => normalised.startsWith(folder));
  return !inAdminOnly || inWritableWindows;
}
