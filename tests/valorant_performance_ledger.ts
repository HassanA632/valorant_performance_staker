import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ValorantPerformanceLedger } from "../target/types/valorant_performance_ledger";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("Valorant Performance Ledger", () => {

  describe("Contract Creation", () => {

    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.ValorantPerformanceLedger as Program<ValorantPerformanceLedger>;
    const provider = anchor.getProvider();

    // Generate new keypair for SolHolder account
    const solHolderAccount = Keypair.generate();

    it("Should initialize the sol holder contract with 5 wallets", async () => {
      // Create 5 test wallet addresses 
      const depositor1 = Keypair.generate().publicKey;
      const depositor2 = Keypair.generate().publicKey;
      const depositor3 = Keypair.generate().publicKey;
      const depositor4 = Keypair.generate().publicKey;
      const depositor5 = Keypair.generate().publicKey;

      const allowedDepositors = [
        depositor1,
        depositor2,
        depositor3,
        depositor4,
        depositor5
      ];

      // Call initialize instruction
      await program.methods
        .initialize(allowedDepositors)
        .accounts({
          solHolder: solHolderAccount.publicKey,
          authority: provider.wallet.publicKey,
        })
        .signers([solHolderAccount])
        .rpc();

      // Fetch account data to verify it was initialized correctly
      const solHolderData = await program.account.solHolder.fetch(
        solHolderAccount.publicKey
      );

      console.log("Sol Holder Account Data:", solHolderData);

      // Verify data was set correctly
      assert.equal(
        solHolderData.authority.toString(),
        provider.wallet.publicKey.toString()
      );
      assert.equal(solHolderData.totalCollected.toString(), "0");
      assert.equal(solHolderData.depositorsCount, 0);

      // Verify all allowed depositors were set
      for (let i = 0; i < 5; i++) {
        assert.equal(
          solHolderData.allowedDepositors[i].toString(),
          allowedDepositors[i].toString()
        );
        assert.equal(solHolderData.deposits[i].toString(), "0");
      }
    });
  });
});