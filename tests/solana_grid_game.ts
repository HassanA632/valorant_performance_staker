import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { SolanaGridGame } from "../target/types/solana_grid_game";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { expect } from 'chai';
import { AnchorError } from '@coral-xyz/anchor';


describe("grid game", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.SolanaGridGame as Program<SolanaGridGame>;
  const provider = anchor.getProvider();

  //expiry time for funding
  let good_expiry_time = new BN(1956288947);
  let bad_expiry_time = new BN(1456288947);

  // Generate new keypair for SolHolder account
  let solHolderAccount: Keypair;
  let solHolderAccount2: Keypair;

  let depositor1: Keypair;
  let depositor2: Keypair;
  let depositor3: Keypair;
  let depositor4: Keypair;
  let depositor_bad: Keypair;

  let vaultPda: PublicKey;
  let vaultPda2: PublicKey;


  before(() => {
    // Create 7 test wallet addresses
    solHolderAccount = Keypair.generate();
    solHolderAccount2 = Keypair.generate();

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), solHolderAccount.publicKey.toBuffer()],
      program.programId
    );
    [vaultPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), solHolderAccount2.publicKey.toBuffer()],
      program.programId
    );


    depositor1 = Keypair.generate();
    depositor2 = Keypair.generate();
    depositor3 = Keypair.generate();
    depositor4 = Keypair.generate();

    depositor_bad = Keypair.generate();

  }
  );

  describe("Contract Creation", () => {
    it("Should initialize the sol holder contract with 5 wallets", async () => {
      const allowedDepositors = [
        depositor1.publicKey,
        depositor2.publicKey,
        depositor3.publicKey,
        depositor4.publicKey,
      ];
      // Call initialize instruction
      await program.methods
        .initialize(allowedDepositors, good_expiry_time)
        .accounts({
          solHolder: solHolderAccount.publicKey,
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
      for (let i = 0; i < 4; i++) {
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

      //console.log("Initial depositor balance:", initialDepositorBalance);
      //console.log("Initial contract balance:", initialContractBalance);

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

      //console.log("Sol Holder Account Data after deposit:", solHolderData);

      //console.log("Final depositor balance:", finalDepositorBalance);
      //console.log("Final contract balance:", finalContractBalance);


    });
    it("Should NOT allow non-whitelisted users to deposit", async () => {

      const depositAmount = new anchor.BN(1_000_000_000); //1 SOL worth
      // Airdrop some SOL to depositor1 for testing
      await provider.connection.requestAirdrop(
        depositor_bad.publicKey,
        2_000_000_000 // 2 SOL
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        await program.methods.deposit(depositAmount).accounts(
          {
            solHolder: solHolderAccount.publicKey,
            depositor: depositor_bad.publicKey,

          })
          .signers([depositor_bad])
          .rpc();
        assert.fail("Expected fail but passed")
      } catch (err) {
        // Program failed as expected
        assert.ok(true);
      }



    });

    it("should let multiple users deposit", async () => {
      const depositAmount = new anchor.BN(1_000_000_000); //1 SOL worth
      // Airdrop some SOL to depositor1 for testing
      await provider.connection.requestAirdrop(
        depositor2.publicKey,
        2_000_000_000 // 2 SOL
      );
      // Airdrop some SOL to depositor1 for testing
      await provider.connection.requestAirdrop(
        depositor3.publicKey,
        2_000_000_000 // 2 SOL
      );
      // Airdrop some SOL to depositor1 for testing
      await provider.connection.requestAirdrop(
        depositor4.publicKey,
        2_000_000_000 // 2 SOL
      );

      // Wait for airdrop to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));

      await program.methods.deposit(depositAmount).accounts(
        {
          solHolder: solHolderAccount.publicKey,
          depositor: depositor2.publicKey,

        })
        .signers([depositor2])
        .rpc();

      await program.methods.deposit(depositAmount).accounts(
        {
          solHolder: solHolderAccount.publicKey,
          depositor: depositor3.publicKey,

        })
        .signers([depositor3])
        .rpc();

      await program.methods.deposit(depositAmount).accounts(
        {
          solHolder: solHolderAccount.publicKey,
          depositor: depositor4.publicKey,

        })
        .signers([depositor4])
        .rpc();

      const solHolderData = await program.account.solHolder.fetch(
        solHolderAccount.publicKey
      );

      assert.equal(solHolderData.deposits[0].toString(), depositAmount.toString());
      assert.equal(solHolderData.deposits[1].toString(), depositAmount.toString());
      assert.equal(solHolderData.deposits[2].toString(), depositAmount.toString());
      assert.equal(solHolderData.deposits[3].toString(), depositAmount.toString());


      //console.log("Sol Holder Account Data after deposit:", solHolderData);

    });

    it("Should NOT allow multiple deposits from the same user", async () => {
      const depositAmount = new anchor.BN(1_000_000_000); //1 SOL worth

      try {
        await program.methods.deposit(depositAmount).accounts(
          {
            solHolder: solHolderAccount.publicKey,
            depositor: depositor4.publicKey,
          })
          .signers([depositor4])
          .rpc();
        assert.fail("Expected fail but passed")

      } catch (err) {
        // Program failed as expected
        assert.ok(true);
      }
    });
  });

  describe("Set Expiry Time", () => {
    it("Should not allow deposits after expiry time of funding round", async () => {
      const allowedDepositors = [
        depositor1.publicKey,
        depositor2.publicKey,
        depositor3.publicKey,
        depositor4.publicKey,
      ];
      // Call initialize instruction
      await program.methods
        .initialize(allowedDepositors, bad_expiry_time)
        .accounts({
          solHolder: solHolderAccount2.publicKey,
        })
        .signers([solHolderAccount2])
        .rpc();

      const depositAmount = new anchor.BN(1_000_000_000); //1 SOL worth

      // Airdrop some SOL to depositor1 for testing
      await provider.connection.requestAirdrop(
        depositor1.publicKey,
        2_000_000_000 // 2 SOL
      );

      // Wait for airdrop to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .deposit(depositAmount)
          .accounts({
            solHolder: solHolderAccount2.publicKey,
            depositor: depositor1.publicKey,
          })
          .signers([depositor1])
          .rpc();

        expect.fail('Expected deposit to fail because funding time has expired');
      } catch (err) {
        const e = err as AnchorError;
        expect(err).to.be.instanceOf(AnchorError);
        expect(err.program.equals(program.programId)).to.eq(true);

        // Assert on error code name
        expect(err.error.errorCode.code).to.equal('FundingTimeExpired');
      }
    });

  });

});