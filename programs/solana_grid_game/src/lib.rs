use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::clock::Clock;
use anchor_lang::system_program::{self, Transfer};

declare_id!("GbqfvdyqWTAUMF52t8VP5yivWy4aPfVsbsGb9j6VvYnu");

#[error_code]
pub enum ErrorCode {
    #[msg("Address provided does not have permission to deposit")]
    UnauthorizedDepositAddress,
    #[msg("Address has already deposited")]
    AlreadyDeposited,
    #[msg("Funding Time has expired")]
    FundingTimeExpired,
}

#[program]
pub mod solana_grid_game {
    use std::thread::current;

    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        allowed_depositors: [Pubkey; 4],
        expiry_time: i64,
    ) -> Result<()> {
        let sol_holder = &mut ctx.accounts.sol_holder;

        sol_holder.authority = ctx.accounts.signer.key();
        sol_holder.allowed_depositors = allowed_depositors;
        sol_holder.deposits = [0; 4];
        sol_holder.total_collected = 0;
        sol_holder.depositors_count = 0;
        sol_holder.expiry_time = expiry_time;
        sol_holder.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let sol_holder = &mut ctx.accounts.sol_holder;
        let depositor = &ctx.accounts.depositor;
        let expiry_time = sol_holder.expiry_time;
        let current_time = Clock::get()?.unix_timestamp;

        require!(current_time < expiry_time, ErrorCode::FundingTimeExpired);

        let depositor_index = sol_holder
            .allowed_depositors
            .iter()
            .position(|&address| address == depositor.key())
            .ok_or(ErrorCode::UnauthorizedDepositAddress)?;

        require!(
            sol_holder.deposits[depositor_index] == 0,
            ErrorCode::AlreadyDeposited
        );

        let transfer_instruction = Transfer {
            from: depositor.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_instruction,
            ),
            amount,
        )?;

        sol_holder.deposits[depositor_index] = amount;
        sol_holder.total_collected = sol_holder.total_collected.saturating_add(amount);
        sol_holder.depositors_count = sol_holder.depositors_count.saturating_add(1);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + SolHolder::INIT_SPACE
    )]
    pub sol_holder: Account<'info, SolHolder>,

    // NEW: a PDA that actually holds lamports
    #[account(
        init,
        payer = signer,
        space = 8, // Vault has no data; 8 bytes for discriminator
        seeds = [b"vault", sol_holder.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub sol_holder: Account<'info, SolHolder>,

    // NEW: the vault PDA for this game
    #[account(
        mut,
        seeds = [b"vault", sol_holder.key().as_ref()],
        bump = sol_holder.vault_bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)] // Provide size of struct automatically
pub struct SolHolder {
    pub authority: Pubkey,
    pub allowed_depositors: [Pubkey; 4], // Wallet addresses involved
    pub deposits: [u64; 4],              // Amount each wallet has deposited
    pub total_collected: u64,            // Total amount deposited
    pub depositors_count: u8,            // How many wallets deposited so far
    pub expiry_time: i64,                // How many wallets deposited so far
    // NEW:
    pub vault_bump: u8,
}

#[account]
pub struct Vault {}
