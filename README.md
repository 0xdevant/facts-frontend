facts.hype web app

A crowd-sourced truth-seeking engine that is maximally aligned with HyperLiquid.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How it works

facts.hype provides a way for users to ask any questions and get the most reliable and credible answer verified by the crowd, with a dispute resolution mechanism built-in.

Phases: Ask => Hunting => Vouch => Challenge => Settle => Review => Finalize(distribute/slash)

1. Users can ask any question and choose to attach a bounty **(Truth-seeker asks)**

2. Others can submit different answers after depositing $HYPE to be a hunter **(Hunter hunts)**

3. Others can vouch for the answer they believe to be true by staking $HYPE on top **(Voucher vouches)**

4. The answer with the most vouched gets selected to be the “most-truthful” answer

   - Hunter and vouchers of the selected answer will share the bounty
   - If there is no submission, or no answer gets more vouched than the others, the result can be settled immediately and no bounty will be distributed

5. Anyone can submit a challenge after the hunting period by paying $HYPE **(Challenger challenges)**

6. If it gets accepted by the DAO - part of the hunter's stake will be **slashed** to challenger, part of vouchers' stake will be **slashed** to the DAO **(DAO settles)**

7. In order to avoid the truth being manipulated by the DAO there is an external party in facts i.e. the Council to override DAO's decision and slash the DAO's $HYPE if needed **(Council reviews)**

8. Anyone can then finalize the question to automatically distribute the bounty and slash related parties
