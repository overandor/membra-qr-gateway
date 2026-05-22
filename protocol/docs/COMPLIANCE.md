# MEMBRA Protocol — Compliance Notes

## Required Language

Use this wording in all user-facing materials:

> MEMBRA is an elastic-supply Solana token with transparent rebase rules, oracle-based price monitoring, public lock incentives, and audited IDO flows. The protocol does not guarantee price, yield, dividends, or profit. Rewards are paid according to public staking and lock rules.

## Prohibited Language

Do NOT use any of the following without explicit legal counsel approval:

- "Guaranteed price"
- "Guaranteed $0.10 to $1.00 daily range"
- "Guaranteed 90-cent volatility window"
- "Guaranteed dividends"
- "Guaranteed passive income"
- "Guaranteed profit"
- "Guaranteed returns"
- "Guaranteed yield"
- "Risk-free harvesting"
- "Risk-free anything"
- "Dividends" (use "protocol rewards" or "lock incentives" instead)
- "Whale dividends"
- "Pay whales not to dump"
- "Randomly creating volatility"
- "Automatic profit capture"

## What the Protocol Does Not Do

To be explicit in all marketing, documentation, and frontend disclosures:

- The protocol does **not** guarantee any price range.
- The protocol does **not** manufacture artificial volatility.
- The protocol does **not** secretly pay whales to avoid selling.
- The protocol does **not** issue private rewards to specific holders.
- The protocol does **not** auto-trade on behalf of users.
- The protocol does **not** promise yield, profit, or returns.
- The protocol does **not** allow direct treasury withdrawal without multisig governance approval.

## Monitoring Band Disclosure

If you reference the monitoring band ($0.10 – $1.00) in user materials, always include:

> "The monitoring band is informational only. The protocol monitors this range to inform rebase decisions but does not guarantee the token price stays within any range. Token prices are determined by the open market and may fall outside this band at any time."

## Reward Disclosure

When describing staking and lock rewards, always include:

> "Rewards are paid pro-rata from a finite reward pool according to public lock and stake rules. Rewards depend on:
> - Available pool balance
> - Total weighted shares staked
> - Configured emission rate
>
> Rewards are not guaranteed. The reward pool may run out. Past reward rates do not indicate future rates."

## Lock Tier Disclosure

When describing lock multipliers, always include:

> "Higher lock multipliers reward longer commitments to the protocol. Locked tokens cannot be unstaked without paying an early-exit penalty (currently {X}%). All penalties go to the protocol treasury or reward pool, never to private parties."

## Jurisdiction Notice

Before launching to the public:

1. Consult legal counsel in every jurisdiction where you intend to offer the token.
2. Consider whether the token qualifies as a security under applicable law.
3. Implement KYC/AML procedures if required.
4. Geofence restricted jurisdictions if required.
5. Provide a clear risk disclosure page on the website.

## Treasury Movement Disclosure

For every treasury movement, publish:

- The on-chain proposal ID and link.
- The action type (withdraw, seed liquidity, etc.).
- The destination address.
- The amount.
- The approving signers.
- The timelock expiry timestamp.
- The execution transaction signature.

Treasury transparency is a core protocol guarantee.

## Audit & Bug Bounty

Before mainnet:
1. Complete an independent security audit.
2. Publish the audit report.
3. Establish a bug bounty program (recommended: Immunefi or similar).
4. Address all critical and high findings.

## Risk Disclosure (Required on Frontend)

Display on every interaction that involves user funds:

> "Smart contract risk: This protocol involves immutable smart contracts. While audited, no audit can guarantee absence of bugs. By interacting with this protocol, you acknowledge this risk.
>
> Market risk: Token prices are volatile and may fall to zero. You may lose your entire investment.
>
> Oracle risk: This protocol uses on-chain oracles. Oracle failures or manipulation may affect protocol behavior despite circuit breakers.
>
> Regulatory risk: The regulatory treatment of tokens varies by jurisdiction and may change. Consult your own legal and tax advisors.
>
> This protocol is not financial advice. Do your own research."
