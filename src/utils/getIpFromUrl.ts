export default function getIpFromUrl(url: string) {
  return url.split("/")[2].split(":")[0];
}
