export const NOTICE_TEMPLATE_BLOCKS = {
  block_header: (data: {
    date: string;
    oppPartyName: string;
    oppPartyAddress: string;
  }) => `
Date: ${data.date}

By Registered Post A/D / Speed Post / Courier

To,
Mr./Ms. ${data.oppPartyName}
S/o / D/o: Not Provided
Address: ${data.oppPartyAddress}
  `.trim(),

  block_subject: () =>
    `SUBJECT:
LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881 FOR DISHONOUR OF CHEQUE`,

  block_intro: (data: { clientName: string; clientAddress: string }) => `
Sir/Madam,

Under instructions and on behalf of my client Mr./Ms. ${data.clientName}, residing at ${data.clientAddress}, I hereby serve upon you the following legal notice:
  `.trim(),

  block_transaction_background: (data: {
    chequeAmount: string;
    transactionDate: string;
    transactionPurpose: string;
    aiNarrative: string;
  }) => `
1. TRANSACTION BACKGROUND

That you had approached my client and availed a sum of Rs. ${data.chequeAmount} (Rupees ${data.chequeAmount} only) on ${data.transactionDate} towards ${data.transactionPurpose}, thereby creating a legally enforceable debt/liability.

${data.aiNarrative}
  `.trim(),

  block_issuance_of_cheque: (data: {
    chequeNumber: string;
    chequeDate: string;
    chequeAmount: string;
    bankName: string;
  }) => `
2. ISSUANCE OF CHEQUE

In discharge of the aforesaid legally enforceable debt/liability, you issued the following cheque:

Cheque No.: ${data.chequeNumber}
Date: ${data.chequeDate}
Amount: Rs. ${data.chequeAmount}
Drawn on: ${data.bankName}

Assuring my client that the same would be honoured upon presentation.
  `.trim(),

  block_dishonour: (data: { returnMemoDate: string; dishonourReason: string }) => `
3. DISHONOUR OF CHEQUE

That my client presented the said cheque within its validity period through his/her banker. However, the cheque was returned unpaid by your bank vide return memo dated ${data.returnMemoDate} with the remarks:

"${data.dishonourReason}"

The dishonour clearly attracts the penal provisions of Section 138 of the Negotiable Instruments Act, 1881.
  `.trim(),

  block_demand: (data: { chequeAmount: string }) => `
4. DEMAND FOR PAYMENT

Therefore, through this notice, you are hereby called upon to make payment of the cheque amount of Rs. ${data.chequeAmount} (Rupees ${data.chequeAmount} only) within 15 (fifteen) days from the date of receipt of this notice.
  `.trim(),

  block_failure_clause: () => `
5. FAILURE CLAUSE

Take notice that if you fail to make the payment within the aforesaid statutory period of 15 days, my client shall be constrained to initiate appropriate criminal proceedings against you under Section 138 read with Section 142 of the Negotiable Instruments Act, 1881, before the competent court of law, at your entire risk as to costs and consequences.

My client also reserves the right to initiate separate civil proceedings for recovery of the amount along with interest and damages.

You are advised to treat this notice as most urgent.
  `.trim(),

  block_closing: (data: {
    advocateName: string;
    advocateEnrollment: string;
    advocateAddress: string;
    advocateContact: string;
  }) => `
Yours faithfully,

(${data.advocateName})
Enrollment No.: ${data.advocateEnrollment}
Address: ${data.advocateAddress}
Contact: ${data.advocateContact}
  `.trim(),

  block_annexures: () => `
ANNEXURES (Recommended)
1. Copy of dishonoured cheque
2. Copy of bank return memo
3. Copy of bank statement (optional but useful)
  `.trim(),
};
