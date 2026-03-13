export type MasjidDetail = {
  masjid_id: string;
  masjid_name: string;
  status: string;
  instance_addr: string | null;
  stablecoin: string;
  masjid_admin: string;
  registered_at: string;
  verified_at: string | null;
  metadata_uri: string;
};

export type BoardMember = {
  id: number;
  member_addr: string;
  instance_addr: string;
  is_active: boolean;
};

export type IpfsMetadata = {
  foto?: string;
  boardMembers?: Array<{ address: string; name?: string }>;
};

export type DonationItem = {
  donor: string;
  amount: string;
  donated_at: string;
  tx_hash: string;
};

export type CashOutItem = {
  id: number;
  request_id: number;
  to_addr: string;
  amount: string;
  proposer: string;
  approvals: number;
  approved_by: string[];
  executor: string | null;
  canceled_by: string | null;
  proposed_at: string;
  settled_at: string | null;
  status_label: "executed" | "canceled" | "expired" | "pending";
  tx_hash: string;
};
