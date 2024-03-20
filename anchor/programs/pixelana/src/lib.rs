use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::{self, AssociatedToken}, token_2022, token_interface::{spl_token_2022::instruction::AuthorityType, Token2022}
};
use solana_program::program::{invoke, invoke_signed};
use spl_token_2022::{extension::ExtensionType, state::Mint};


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

    pub fn mint_nft(ctx: Context<MintNft>) -> Result<()> {
        msg!("Mint nft with meta data extension and additional meta data");

        let space = match ExtensionType::try_calculate_account_len::<Mint>(&[ExtensionType::MetadataPointer]) {
            Ok(space) => space,
            Err(_) => return err!(GameError::InvalidMintAccountSpace)
        };

        // This is the space required for the metadata account. 
        // We put the meta data into the mint account at the end so we 
        // don't need to create and additional account. 
        let meta_data_space = 250;

        let lamports_required = (Rent::get()?).minimum_balance(space + meta_data_space);

        msg!(
            "Create Mint and metadata account size and cost: {} lamports: {}",
            space as u64,
            lamports_required
        );

        system_program::create_account(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.signer.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
            ),
            lamports_required,
            space as u64,
            &ctx.accounts.token_program.key(),
        )?;

        // Assign the mint to the token program
        system_program::assign(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                system_program::Assign {
                    account_to_assign: ctx.accounts.mint.to_account_info(),
                },
            ),
            &token_2022::ID,
        )?;

        // Initialize the metadata pointer (Need to do this before initializing the mint)
        let init_meta_data_pointer_ix = 
        match spl_token_2022::extension::metadata_pointer::instruction::initialize(
            &Token2022::id(),
            &ctx.accounts.mint.key(),
            Some(ctx.accounts.nft_authority.key()),
            Some(ctx.accounts.mint.key()),
        ) {
            Ok(ix) => ix,
            Err(_) => return err!(GameError::InvalidMintAccountSpace)
        };
        
        invoke(
            &init_meta_data_pointer_ix,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.nft_authority.to_account_info()
            ],
        )?;
        
        // Initialize the mint cpi
        let mint_cpi_ix = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::InitializeMint2 {
                mint: ctx.accounts.mint.to_account_info(),
            },
        );

        token_2022::initialize_mint2(
            mint_cpi_ix,
            0,
            &ctx.accounts.nft_authority.key(),
            None).unwrap();
        
        // We use a PDA as a mint authority for the metadata account because 
        // we want to be able to update the NFT from the program.
        let seeds = b"nft_authority";
        let bump = ctx.bumps.nft_authority;
        let signer: &[&[&[u8]]] = &[&[seeds, &[bump]]];

        msg!("Init metadata {0}", ctx.accounts.nft_authority.to_account_info().key);

        // Init the metadata account
        // TODO: Add the metadata to the mint account as we need
        let init_token_meta_data_ix = 
        &spl_token_metadata_interface::instruction::initialize(
            &spl_token_2022::id(),
            ctx.accounts.mint.key,
            ctx.accounts.nft_authority.to_account_info().key,
            ctx.accounts.mint.key,
            ctx.accounts.nft_authority.to_account_info().key,
            "Beaver".to_string(),
            "BVA".to_string(),
            "https://arweave.net/MHK3Iopy0GgvDoM7LkkiAdg7pQqExuuWvedApCnzfj0".to_string(),
        );

        invoke_signed(
            init_token_meta_data_ix,
            &[ctx.accounts.mint.to_account_info().clone(), ctx.accounts.nft_authority.to_account_info().clone()],
            signer,
        )?;

        // Update the metadata account with an additional metadata field in this case the player level
        invoke_signed(
            &spl_token_metadata_interface::instruction::update_field(
                &spl_token_2022::id(),
                ctx.accounts.mint.key,
                ctx.accounts.nft_authority.to_account_info().key,
                spl_token_metadata_interface::state::Field::Key("level".to_string()),
                "1".to_string(),
            ),
            &[
                ctx.accounts.mint.to_account_info().clone(),
                ctx.accounts.nft_authority.to_account_info().clone(),
            ],
            signer
        )?;

        // Create the associated token account
        associated_token::create(
            CpiContext::new(
            ctx.accounts.associated_token_program.to_account_info(),
            associated_token::Create {
                payer: ctx.accounts.signer.to_account_info(),
                associated_token: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        ))?;

        // Mint one token to the associated token account of the player
        token_2022::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token_2022::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.nft_authority.to_account_info(),
                },
                signer
            ),
            1,
        )?;

        // Freeze the mint authority so no more tokens can be minted to make it an NFT
        token_2022::set_authority(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token_2022::SetAuthority {
                    current_authority: ctx.accounts.nft_authority.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
                signer
            ),
            AuthorityType::MintTokens,
            None,
        )?;

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


#[derive(Accounts)]
pub struct MintNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
    #[account(mut)]
    pub token_account: AccountInfo<'info>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub mint: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(  
        init_if_needed,
        seeds = [b"nft_authority".as_ref()],
        bump,
        space = 8,
        payer = signer,
    )]
    pub nft_authority: Account<'info, NftAuthority >
  
}

#[account]
pub struct NftAuthority {
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
    #[msg("Can't initialize metadata pointer")]
    InvalidMintAccountSpace
}
