// Branch's own details as they must appear on every invoice (Dutch invoice
// requirements: name, address, KVK and btw-id of the supplier).
const COMPANY = {
  name: "Branch",
  legalForm: "Eenmanszaak",
  addressLines: ["Kustrif 115", "8224 BJ Lelystad", "Nederland"],
  kvk: "42001190",
  vatId: "NL005424795B25",
  email: "contact@infobranch.nl",
};

// Charged on top of each client's per-transaction fee. Once the KOR is
// approved this becomes 0 and the invoice shows the exemption text instead.
const VAT_RATE_PERCENT = 21;

module.exports = { COMPANY, VAT_RATE_PERCENT };
