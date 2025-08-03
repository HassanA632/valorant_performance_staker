import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ValorantPerformanceLedger } from "../target/types/valorant_performance_ledger";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("Valorant Performance Ledger", () => {

  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ValorantPerformanceLedger as Program<ValorantPerformanceLedger>;
  const provider = anchor.getProvider();

  // Generate new keypair for SolHolder account
  const solHolderAccount = Keypair.generate();

  // Create 5 test wallet addresses 
  const depositor1 = Keypair.generate();
  const depositor2 = Keypair.generate();
  const depositor3 = Keypair.generate();
  const depositor4 = Keypair.generate();
  const depositor5 = Keypair.generate();

  describe("Contract Creation", () => {



    it("Should initialize the sol holder contract with 5 wallets", async () => {

      const allowedDepositors = [
        depositor1.publicKey,
        depositor2.publicKey,
        depositor3.publicKey,
        depositor4.publicKey,
        depositor5.publicKey
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

  describe("Deposit SOL", () => {
    it("Should let whitelisted user deposit SOL", async () => {
      const depositAmount = new anchor.BN(1_000_000_000); //1 SOL worth

      // Airdrop some SOL to depositor1 for testing
      await provider.connection.requestAirdrop(
        depositor1.publicKey,
        2_000_000_000 // 2 SOL
      );

      // Wait for airdrop to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get initial balances
      const initialDepositorBalance = await provider.connection.getBalance(
        depositor1.publicKey
      );
      const initialContractBalance = await provider.connection.getBalance(
        solHolderAccount.publicKey
      );

      console.log("Initial depositor balance:", initialDepositorBalance);
      console.log("Initial contract balance:", initialContractBalance);

      // Call deposit instruction
      await program.methods.deposit(depositAmount).accounts(
        {
          solHolder: solHolderAccount.publicKey,
          depositor: depositor1.publicKey,

        })
        .signers([depositor1])
        .rpc();

      // Check the account data was updated
      const solHolderData = await program.account.solHolder.fetch(
        solHolderAccount.publicKey
      );
      // Verify the deposit was recorded
      assert.equal(solHolderData.deposits[0].toString(), depositAmount.toString());
      assert.equal(solHolderData.totalCollected.toString(), depositAmount.toString());
      assert.equal(solHolderData.depositorsCount, 1);

      // Check SOL balance after instruction
      const finalDepositorBalance = await provider.connection.getBalance(
        depositor1.publicKey
      );
      const finalContractBalance = await provider.connection.getBalance(
        solHolderAccount.publicKey
      );

      console.log("Final depositor balance:", finalDepositorBalance);
      console.log("Final contract balance:", finalContractBalance);

    });

  });
});