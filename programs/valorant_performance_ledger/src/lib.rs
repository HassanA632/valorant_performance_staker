use anchor_lang::prelude::*;

declare_id!("DDbQzCa6kgnfZ667QFcBGbfUYGcjoPbnKbMNgTKedF2m");

#[program]
pub mod valorant_performance_ledger {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
