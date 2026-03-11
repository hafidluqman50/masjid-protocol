const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT ?? "";
const PINATA_API = "https://api.pinata.cloud/pinning";

export async function uploadFileToPinata(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${PINATA_API}/pinFileToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Pinata upload gagal: ${res.statusText}`);
  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

export async function uploadJSONToPinata(json: object): Promise<string> {
  const res = await fetch(`${PINATA_API}/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinataContent: json }),
  });

  if (!res.ok) throw new Error(`Pinata JSON upload gagal: ${res.statusText}`);
  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}
