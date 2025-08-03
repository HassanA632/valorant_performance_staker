use anchor_lang::prelude::*;

declare_id!("DDbQzCa6kgnfZ667QFcBGbfUYGcjoPbnKbMNgTKedF2m");

#[error_code]
pub enum ErrorCode{
    #[msg("Address provided does not have permission to deposit")]
    UnauthorizedDepositAddress,
    #[msg("Address has already deposited")]
    AlreadyDeposited
}

#[program]
pub mod valorant_performance_ledger {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, allowed_depositors: [Pubkey; 5]) -> Result<()> {
        let sol_holder = &mut ctx.accounts.sol_holder;

        sol_holder.authority = ctx.accounts.signer.key();
        sol_holder.allowed_depositors = allowed_depositors;
        sol_holder.deposits = [0; 5];
        sol_holder.total_collected = 0; 
        sol_holder.depositors_count = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64)-> Result<()>{
        let sol_holder = &mut ctx.accounts.sol_holder;
        let depositor = &ctx.accounts.depositor;

        // Check if address executing deposit is whitelisted 
        let depositor_index = sol_holder.allowed_depositors.iter()
        .position(|&address| address == depositor.key())
        .ok_or(ErrorCode::UnauthorizedDepositAddress)?;

        // Check if user has already deposited
        require!(sol_holder.deposits[depositor_index] == 0, ErrorCode::AlreadyDeposited);

        //transfer SOL from depositer (user executing instruction) to contract
        let transfer_instruction = anchor_lang::system_program::Transfer{
            from: depositor.to_account_info(),
            to: sol_holder.to_account_info(),
        };
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_instruction,
            ),
            amount,
        )?;

        //update record
        sol_holder.deposits[depositor_index] = amount;
        sol_holder.total_collected += amount;
        sol_holder.depositors_count +=1;
        
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
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info>{
    #[account(mut)]
    pub sol_holder: Account<'info, SolHolder>,
    #[account(mut)]
    pub depositor: Signer<'info>,
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
