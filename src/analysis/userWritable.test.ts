import { userWritableLocation } from './userWritable';

describe('userWritableLocation', () => {
  it.each([
    'C:\\Users\\ada\\Downloads\\setup.exe',
    'C:\\Users\\ada\\AppData\\Local\\Temp\\x.exe',
    'c:\\users\\ada\\appdata\\roaming\\tool\\tool.exe',
    'C:\\Users\\Public\\run.exe',
    'C:\\Windows\\Temp\\x.exe',
    'C:\\Windows\\Tasks\\x.exe',
    'C:\\Windows\\tracing\\x.exe',
    'C:\\Windows\\System32\\Tasks\\x.exe',
    'C:\\Windows\\System32\\spool\\drivers\\color\\x.exe',
    'C:\\Windows\\SysWOW64\\Tasks\\x.exe',
    'C:\\ProgramData\\Vendor\\agent.exe',
    'C:\\Tools\\tool.exe',
    'C:\\$Recycle.Bin\\x.exe',
    'D:\\setup.exe',
    'E:\\Apps\\app.exe',
    '\\\\fileserver\\share\\app.exe',
    'C:/Users/ada/Downloads/setup.exe',
    'C:\\Program Files\\..\\Users\\ada\\x.exe',
    '',
    'setup.exe',
    'C:\\Windows\\Tasks',
    'C:\\Windows\\Temp',
    'C:\\Windows\\PLA\\Reports\\x.exe',
    'C:\\Windows\\SysWOW64\\Microsoft\\Crypto\\RSA\\MachineKeys\\x.exe',
    '\\\\?\\C:\\Users\\ada\\x.exe',
    '\\Device\\HarddiskVolume3\\Program Files\\x.exe',
  ])('treats %s as a User-writable location', (path) => {
    expect(userWritableLocation(path)).not.toBeNull();
  });

  it.each([
    'C:\\Program Files\\Contoso\\addin.exe',
    'C:\\Program Files (x86)\\Contoso\\addin.exe',
    'c:\\program files\\microsoft office\\root\\office16\\winword.exe',
    'C:\\Windows\\System32\\cmd.exe',
    'C:\\Windows\\SysWOW64\\wscript.exe',
    'C:\\Windows\\explorer.exe',
    'C:\\Program Files\\Contoso',
    '\\\\?\\C:\\Program Files\\Contoso\\addin.exe',
  ])('treats %s as a location ordinary users cannot write to', (path) => {
    expect(userWritableLocation(path)).toBeNull();
  });

  it.each([
    ['C:\\Users\\ada\\Downloads\\setup.exe', 'the Downloads folder'],
    ['C:\\Users\\ada\\AppData\\Local\\Temp\\x.exe', 'the temp folder'],
    ['C:\\Users\\ada\\AppData\\Roaming\\tool\\tool.exe', 'AppData'],
    ['C:\\Users\\Public\\run.exe', 'a user profile'],
    ['C:\\ProgramData\\Vendor\\agent.exe', 'ProgramData'],
    ['C:\\Windows\\Temp\\x.exe', 'a folder in Windows where ordinary users can create files'],
    ['C:\\Tools\\tool.exe', 'a folder on C: outside Program Files and Windows'],
    ['E:\\Apps\\app.exe', 'a drive other than C:, which may be removable'],
    ['\\\\fileserver\\share\\app.exe', 'a network share'],
    ['\\Device\\HarddiskVolume3\\Program Files\\x.exe', 'a path that is not on a local drive'],
    ['setup.exe', 'a path that is not on a local drive'],
    ['C:\\Program Files\\..\\Users\\ada\\x.exe', 'a path with . or .. in it'],
  ])('names the kind of User-writable location of %s: %s', (path, name) => {
    expect(userWritableLocation(path)).toBe(name);
  });
});
