use anchor_lang::prelude::*;

declare_id!("DDbQzCa6kgnfZ667QFcBGbfUYGcjoPbnKbMNgTKedF2m");

#[program]
pub mod valorant_performance_ledger {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, allowed_depositors: [Pubkey; 5]) -> Result<()> {
        let sol_holder = &mut ctx.accounts.sol_holder;

        sol_holder.authority = ctx.accounts.authority.key();
        sol_holder.allowed_depositors = allowed_depositors;
        sol_holder.deposits = [0; 5];
        sol_holder.total_collected = 0;
        sol_holder.depositors_count = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SolHolder::INIT_SPACE 
    )]
    pub sol_holder: Account<'info, SolHolder>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)] // Provide size of struct automatically
pub struct SolHolder {
    pub authority: Pubkey,
    pub allowed_depositors: [Pubkey; 5], // Wallet addresses involved
    pub deposits: [u64; 5],              // Amount each wallet has deposited
    pub total_collected: u64,            // Total amount deposited
    pub depositors_count: u8,            // How many wallets deposited so far
}
