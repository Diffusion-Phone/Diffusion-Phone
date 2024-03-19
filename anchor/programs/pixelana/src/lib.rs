use anchor_lang::prelude::*;
use anchor_lang::system_program;

pub const SEED_PLAYER: &[u8] = b"player";

declare_id!("5uztqw9ZhJ951kFm18eGZzFmCTJpG3LGzfvKcXSWfuUp");

#[program]
pub mod pixelana {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.total_balance = 0; // Initialize the total balance
        Ok(())
    }

    pub fn deposit_to_vault(ctx: Context<DepositToVault>, amount: u64) -> Result<()> {
        // Construct the CPI to the System Program to transfer `amount` of lamports
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.player.increase_balance(amount);

        Ok(())
    }

    pub fn withdraw_from_vault(ctx: Context<WithDrawFromVault>, amount: u64) -> Result<()> {
        require!(ctx.accounts.player.balance >= amount, GameError::NotEnoughBalance);
        // Construct the CPI to the System Program to transfer `amount` of lamports
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.withdrawer.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.player.decrease_balance(amount);
        Ok(())
    }

    pub fn initialize_game(ctx: Context<InitializeGame>, game_id: String) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let host = &mut ctx.accounts.host;
        // game.game_id = game_id;
        game.host = *ctx.accounts.payer.key;
        game.status = GameState::WaitingForParticipants;
        host.set_game(game.key());
        host.increment_games();
        Ok(())
    }

    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        // let player = &mut ctx.accounts.player;
        // player.current_game = None;
        // player.balance = 0;
        // player.games = 0;
        Ok(())
    }

    pub fn deduct_balance(ctx: Context<DeductBalance>, amount: u64) -> Result<()> {
        let player = &mut ctx.accounts.player;
        require!(player.has_sufficient(amount), GameError::NotEnoughBalance);
        player.decrease_balance(amount);
        Ok(())
    }

    // FIXME: so one thing here is when game finished we did not set player.game to None, therefore not need to check that
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player = &mut ctx.accounts.player;
        require!(game.participants.len() <= 6, GameError::GameFull);
        require!(game.status == GameState::WaitingForParticipants, GameError::InvalidGameState);
        // Add the new participant
        game.participants.push(*ctx.accounts.payer.key);
        player.set_game(game.key());
        player.increment_games();
        Ok(())
    }

    pub fn start_game(ctx: Context<StartGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;

        // Ensure the game is in a state that allows starting
        require!(
            game.status == GameState::WaitingForParticipants,
            GameError::InvalidGameState
        );

        // Update the game's state to InProgress
        game.status = GameState::WaitingForStory;

        Ok(())
    }


    pub fn submit_story(ctx: Context<SubmitStory>, story: String) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.story = story;
        game.status = GameState::WaitingForDrawings;
        Ok(())
    }

    pub fn submit_drawing(ctx: Context<SubmitDrawing>, drawing_ref: String) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(
            game.status == GameState::WaitingForDrawings,
            GameError::NotAcceptingDrawings
        );

        // Add the drawing to the list of submissions
        game.drawings.push(Drawing {
            participant: *ctx.accounts.participant.key,
            drawing_ref,
        });

        // Check if all participants have submitted their drawings
        if game.drawings.len() == game.participants.len() {
            // Update the game status to indicate it's ready for the host to select the winner
            game.status = GameState::SelectingWinner;
        }

        Ok(())
    }

    pub fn select_winner(ctx: Context<SelectWinner>, winning_drawing: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.winning_drawing = game.drawings[winning_drawing as usize].clone();
        game.status = GameState::Completed;
        // Mint NFT logic goes here
        Ok(())
    }

    pub fn close_game(ctx: Context<CloseGame>) -> Result<()>{
        msg!("Game closed");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = creator,
        seeds = [b"vault"],
        bump,
        space = 8 + 1 + 8// std::mem::size_of::<Vault>(), // Adjust space according to your needs
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub creator: Signer<'info>, // Account that pays for the vault initialization
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToVault<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, address= Player::pda(depositor.key()).0)]
    pub player: Account<'info, Player>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct WithDrawFromVault<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub withdrawer: Signer<'info>,
    #[account(mut, address = Player::pda(withdrawer.key()).0)]
    pub player: Account<'info, Player>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub bump: u8, // Store the bump to allow for programmatic access
    pub total_balance: u64, // Optionally track the total balance of SOL in the vault
}

#[account]
#[derive(Default)]
pub struct Player {
    pub current_game: Option<Pubkey>, // 32 + 1
    pub balance: u64, // 8
    pub games: u64 // 8
}

impl Player {
    pub fn pda(owner: Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[SEED_PLAYER, owner.as_ref()], &crate::ID)
    }

    pub fn set_game(&mut self, game: Pubkey) {
        self.current_game = Some(game);
    }

    pub fn increment_games(&mut self) {
        self.games += 1;
    }

    pub fn in_game(&self) -> bool {
        self.current_game.is_some()
    }

    pub fn increase_balance(&mut self, amount: u64) {
        self.balance += amount;
    }

    pub fn decrease_balance(&mut self, amount: u64) {
        self.balance -= amount;
    }

    pub fn has_sufficient(&self, amount: u64) -> bool {
        if amount <= self.balance {
            return true;
        } else {
            return false;
        }
    }
}


#[derive(Accounts)]
pub struct InitializePlayer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>, // Account that pays for the vault initialization

    #[account(
        init_if_needed,
        seeds = [b"player", payer.key.as_ref()],
        bump,
        payer = payer,
        space = 8 + 32 + 1 + 8 + 8// std::mem::size_of::<Player>(), // Adjust space according to your needs
    )]
    pub player: Account<'info, Player>,

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct DeductBalance<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = Player::pda(payer.key()).0)]
    pub player: Account<'info, Player>,
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct InitializeGame<'info> {
    #[account(init, payer = payer, space = 10240, seeds = [b"game", game_id.as_bytes()], bump)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = Player::pda(payer.key()).0)]
    pub host: Account<'info, Player>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = Player::pda(payer.key()).0)]
    pub player: Account<'info, Player>,
    // pub host: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(mut, has_one = host)]
    pub game: Account<'info, Game>,
    pub host: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitStory<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub host: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitDrawing<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub participant: Signer<'info>,
}

// would make the mint logic here
#[derive(Accounts)]
pub struct SelectWinner<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub host: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseGame<'info> {
    #[account(mut, close = host)]
    pub game: Account<'info, Game>,
    pub host: Signer<'info>,
}

#[account]
pub struct Game {
    // pub game_id: String,
    pub host: Pubkey,
    pub participants: Vec<Pubkey>,
    pub story: String,
    pub drawings: Vec<Drawing>,
    pub winning_drawing: Drawing,
    pub status: GameState,
}

// space = 32 + 4 + the length of drawing ref
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Drawing {
    pub participant: Pubkey,
    pub drawing_ref: String,
}



// space = 1
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum GameState {
    WaitingForParticipants,
    WaitingForStory,
    WaitingForDrawings,
    SelectingWinner,
    Completed,
}

#[error_code]
pub enum GameError {
    #[msg("The game is already full.")]
    GameFull,
    #[msg("You have already submit your drawing.")]
    NotAcceptingDrawings,
    #[msg("This stage does not match the current game.")]
    InvalidGameState,
    #[msg("Not Enough Balance")]
    NotEnoughBalance,
}
