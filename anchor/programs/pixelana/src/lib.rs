use anchor_lang::prelude::*;

declare_id!("HihKqREGVHempQFaTLk6XGwB5u8YPopfhX1ptjvXYaqt");

#[program]
pub mod pixelana {
    use super::*;
    pub fn initialize_game(ctx: Context<InitializeGame>, game_id: String) -> Result<()> {
        let game = &mut ctx.accounts.game;
        // game.game_id = game_id;
        game.host = *ctx.accounts.host.key;
        game.status = GameState::WaitingForParticipants;
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(game.participants.len() <= 6, GameError::GameFull);
        // Add the new participant
        game.participants.push(*ctx.accounts.participant.key);
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

    pub fn select_winner(ctx: Context<SelectWinner>, winning_drawing: usize) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.winning_drawing = game.drawings[winning_drawing].clone();
        game.status = GameState::Completed;
        // Mint NFT logic goes here
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(init, payer = host, space = 10240)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub host: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut, has_one=host)]
    pub game: Account<'info, Game>,
    pub participant: Signer<'info>,
    pub host: AccountInfo<'info>,
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

#[derive(Accounts)]
pub struct SelectWinner<'info> {
    #[account(mut)]
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Drawing {
    pub participant: Pubkey,
    pub drawing_ref: String,
}

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
}
