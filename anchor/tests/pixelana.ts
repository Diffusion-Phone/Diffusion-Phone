import { getKeypairFromFile } from '@solana-developers/helpers';
import { createContext } from 'react';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Pixelana } from "../target/types/pixelana";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";


function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

describe("anchor", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Pixelana as Program<Pixelana>;
  const provider = anchor.getProvider();
  const programProvider = program.provider as anchor.AnchorProvider;
  let host = programProvider.wallet;
  // let participants: Array<Keypair> = [];
  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

  // async function airdropSol(publicKey, lamports = 1*LAMPORTS_PER_SOL) {
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(publicKey, lamports),
  //     "confirmed"
  //   );
  // }

  async function initPlayer(payer: Keypair) {
    const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), payer.publicKey.toBuffer()], program.programId);
    const tx = await program.methods.initializePlayer({lifeInTheBalance: {}}).accounts({
      payer: payer.publicKey,
      player: playerPda
    }).signers([payer]).rpc()
    console.log("init player: ", tx)
    return [playerPda, playerBump] as const;
  }


  before('init vault', async () => {
    // Could only run once
    const initVault = await program.methods.initializeVault().accounts({
      creator: host.publicKey,
      vault: vaultPda
    }).rpc();
    console.log("init vault tx:", initVault);
    await program.account.vault.fetch(vaultPda).then((vault) => {
      console.log("vault:", vault)
    })
  });

  it('init player: host', async () => {
    const hostPub = programProvider.wallet.publicKey;
    const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), hostPub.toBuffer()], program.programId);
    const tx = await program.methods.initializePlayer({lifeInTheBalance: {}}).accounts({
      payer: hostPub,
      player: playerPda
    }).rpc({commitment: "confirmed"});

    console.log("init host success tx: ", tx);
    // const player = await program.account.player.fetch(playerPda);
    // console.log("host:", player)

    const hostDeposit = await program.methods.depositToVault(new anchor.BN(1 * LAMPORTS_PER_SOL)).accounts({ 
      depositor: hostPub,
      vault: vaultPda,
      player: playerPda
    }).rpc({
      skipPreflight: true,
      commitment: "confirmed",
      // maxRetries: 3
    });

    console.log("deposited to vault tx:", hostDeposit);
    const playerAfterDeposit = await program.account.player.fetch(playerPda);

    expect(playerAfterDeposit.balance.toNumber()).to.equal(1 * LAMPORTS_PER_SOL);
    expect(playerAfterDeposit.avatar).to.eql({lifeInTheBalance: {}}) 
    expect(playerAfterDeposit.currentGame).to.equal(null);
    expect(playerAfterDeposit.games.toNumber()).to.equal(0);
  });

  it('reinit host player', async () => {
    const hostPub = programProvider.wallet.publicKey;
    const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), hostPub.toBuffer()], program.programId);
    const tx = await program.methods.initializePlayer({ghost: {}}).accounts({
      payer: hostPub,
      player: playerPda
    }).rpc();
    console.log("reinit host success tx(should not do anything):", tx);
    const player = await program.account.player.fetch(playerPda);
    expect(player.balance.toNumber()).to.equal(1 * LAMPORTS_PER_SOL);
    // should not reinitialize
    expect(player.avatar).to.eql({lifeinthebalance: {}}) 
    expect(player.currentGame).to.equal(null);
    expect(player.games.toNumber()).to.equal(0);
  });

  //test it once
  it('init game', async () => {
    const game_id = generateRandomString(8);
    const hostPub = host.publicKey;
    const [gamePda, gameBump] = PublicKey.findProgramAddressSync([Buffer.from("game"), Buffer.from(game_id)], program.programId);

    const [hostPda, hostBump] = await PublicKey.findProgramAddressSync([Buffer.from("player"), hostPub.toBuffer()], program.programId);

    // host is in the game now
    const game  = await program.methods.initializeGame(game_id).accounts({
      game: gamePda,
      payer: hostPub,
      host: hostPda
    }).rpc();

    console.log("init game tx: ", game)

    const player = await program.account.player.fetch(hostPda);
    expect(player.currentGame.toBase58()).to.equal(gamePda.toBase58()); 
    const gameState = await program.account.game.fetch(gamePda)
    expect(gameState.participants.length).to.equal(0);
    expect(gameState.status).to.eql({waitingForParticipants: {}})
  })

  describe("a whole game", () => {
    const game_id = generateRandomString(8);
    const [gamePda, gameBump] = PublicKey.findProgramAddressSync([Buffer.from("game"), Buffer.from(game_id)], program.programId);
    before('a game for rest of test', async () => {
      const [hostPda, hostBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), host.publicKey.toBuffer()], program.programId);
      const game = await program.methods.initializeGame(game_id).accounts({
        game: gamePda,
        payer: host.publicKey,
        host: hostPda
      }).rpc();
    });

    it('init & join player: 1', async () => {
      const player = await getKeypairFromFile('keypair1.json')
      // await airdropSol(player.publicKey);
      const [playerPda, _] = await initPlayer(player);

      const player1JoinGame = await program.methods.joinGame().accounts({
        payer: player.publicKey,
        player: playerPda,
        game: gamePda
      }).signers([player]).rpc()

      console.log("player 1 join game tx: ", player1JoinGame)

      await program.methods.depositToVault(new anchor.BN(1 * LAMPORTS_PER_SOL)).accounts({ 
        depositor: player.publicKey,
        vault: vaultPda,
        player: playerPda
      }).signers([player]).rpc({
        skipPreflight:true,
        commitment: "confirmed",
        maxRetries: 3
      }); 

      const player1 = await program.account.player.fetch(playerPda);
      expect(player1.currentGame.toBase58()).to.equal(gamePda.toBase58());
      expect(player1.balance.toNumber()).to.equal(1 * LAMPORTS_PER_SOL);
      const gameState = await program.account.game.fetch(gamePda)
      expect(gameState.participants.length).to.equal(1);
      expect(gameState.status).to.eql({waitingForParticipants: {}})
    })

    it('init & join player: 2', async () => {
      const player = await getKeypairFromFile('keypair2.json')
      // await airdropSol(player.publicKey);
      const [playerPda, _] = await initPlayer(player);

      const player2JoinGame = await program.methods.joinGame().accounts({
        payer: player.publicKey,
        player: playerPda,
        game: gamePda
      }).signers([player]).rpc()

      console.log("player 2 join game tx: ", player2JoinGame)
      const player2 = await program.account.player.fetch(playerPda);
      expect(player2.currentGame.toBase58()).to.equal(gamePda.toBase58());
      const gameState = await program.account.game.fetch(gamePda);
      expect(gameState.participants.length).to.equal(2);
      expect(gameState.status).to.eql({waitingForParticipants: {}})
    })

      // Initialize the game

    it('start game', async () => {
      // signed by host and therefore auto signed
      await program.methods.startGame().accounts({
        game: gamePda,
        host: host.publicKey
      }).rpc() 
      const gameState = await program.account.game.fetch(gamePda)
      expect(gameState.participants.length).to.equal(2);
      expect(gameState.status).to.eql({waitingForStory: {}})
    })

    it('submit story', async () => {
      // signed by host and therefore auto signed
      const story = "Once upon a time...";
      await program.methods.submitStory(story).accounts({
        game: gamePda,
        host: host.publicKey
      }).rpc();
      // Verify the story was submitted
      const game = await program.account.game.fetch(gamePda);
      expect(game.story).to.equal(story);
      expect(game.status).to.eql({waitingForDrawings: {}})
    });

    it('player 1: submit drawing', async () => {
      // signed by player1 (in real world, this would be signed by another wallet)
      const player = await getKeypairFromFile('keypair1.json')
      // figure out a way to store the img url
      const drawingRef = `drawing_${1}`;
      await program.methods.submitDrawing(drawingRef).accounts({
        game: gamePda,
        participant: player.publicKey
      }).signers([player]).rpc()
      const game = await program.account.game.fetch(gamePda);
      expect(game.participants.length).to.equal(2);
      expect(game.drawings.length).to.equal(1);
      expect(game.status).to.eql({waitingForDrawings: {}})
    });

    it('player 2: submit drawing', async () => {
      // signed by player2 (in real world, this would be signed by another wallet)
      const player = await getKeypairFromFile('keypair2.json')
      // figure out a way to store the img url
      const drawingRef = `drawing_${2}`;
      await program.methods.submitDrawing(drawingRef).accounts({
        game: gamePda,
        participant: player.publicKey
      }).signers([player]).rpc()
      const game = await program.account.game.fetch(gamePda);
      expect(game.participants.length).to.equal(2);
      expect(game.drawings.length).to.equal(2);
      expect(game.status).to.eql({selectingWinner: {}})
    });
    
    it('host: select winner', async () => {
      // signed by host
      // just to verify that the winner is selected
      const player = await getKeypairFromFile('keypair1.json')
      const winnerIndex = 0;
      await program.methods.selectWinner(winnerIndex).accounts({
        game: gamePda,
        host: host.publicKey
      }).rpc()
      const game = await program.account.game.fetch(gamePda);
      expect(game.status).to.eql({waitForMinting: {}})
      expect(game.winningDrawing).to.eql({participant: player.publicKey, drawingRef: `drawing_${1}`});
    });

    it('host: mintNFT', async () => {
      // signed by host
      const player = await getKeypairFromFile('keypair1.json')
      let mint = new Keypair();
      const destinationTokenAccount = getAssociatedTokenAddressSync(
        mint.publicKey,
        player.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const nft_authority = await PublicKey.findProgramAddressSync(([Buffer.from("nft_authority")]), program.programId)
      const tx = await program.methods.mintNft().accounts({
        host: host.publicKey,
        game: gamePda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenAccount: destinationTokenAccount,
        mint: mint.publicKey,
        nftAuthority: nft_authority[0],
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }).signers([mint]).rpc({
        skipPreflight: true 
      })

      console.log("minted nft tx: ", tx)
      const game = await program.account.game.fetch(gamePda);
      expect(game.status).to.eql({completed: {}})
    });
  })
});
