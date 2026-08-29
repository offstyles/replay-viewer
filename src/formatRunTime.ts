export function formatRunTime(time: number): string {
  const prefix = time < 0 ? '-' : '';
  let seconds = Math.floor(Math.abs(time));
  const ms = Math.floor((time - seconds) * 1000);
  const hours = Math.floor(seconds / 3600);
  seconds = Math.floor(seconds % 3600);
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const hoursStr = ('00' + hours).slice(-2);
  const minutesStr = ('00' + minutes).slice(-2);
  const secondsStr = ('00' + seconds).slice(-2);
  const msStr = ('000' + ms).slice(-3);
  if (hours === 0) {
    return prefix + minutesStr + ':' + secondsStr + '.' + msStr;
  }
  return prefix + hoursStr + ':' + minutesStr + ':' + secondsStr + '.' + msStr;
}
