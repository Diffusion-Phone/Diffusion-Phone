import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Anchor } from "../target/types/anchor";

describe("anchor", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Anchor as Program<Anchor>;
  const provider = anchor.getProvider();
  let gameAccount = null;
  let host = null;
  let participants = [];

  async function airdropSol(publicKey, lamports = 1000000000) {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(publicKey, lamports),
      "confirmed"
    );
  }

  before(async () => {
    // Setup the host account
    host = anchor.web3.Keypair.generate();
    await airdropSol(host.publicKey);

    // Setup game account
    gameAccount = anchor.web3.Keypair.generate();

    // Initialize the game
    await program.rpc.initializeGame("game123", {
      accounts: {
        game: gameAccount.publicKey,
        host: host.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [gameAccount, host],
    });
  });

  it('Allows participants to join the game', async () => {
    // Create and add 7 participants
    for (let i = 0; i < 7; i++) {
      let participant = anchor.web3.Keypair.generate();
      await airdropSol(participant.publicKey);

      await program.rpc.joinGame({
        accounts: {
          game: gameAccount.publicKey,
          participant: participant.publicKey,
        },
        signers: [participant],
      });

      participants.push(participant);
    }

    // Fetch the updated game account
    const game = await program.account.game.fetch(gameAccount.publicKey);
    assert.strictEqual(game.participants.length, 7);
  });

  it('Host submits a story', async () => {
    const story = "Once upon a time...";
    await program.rpc.submitStory(story, {
      accounts: {
        game: gameAccount.publicKey,
        host: host.publicKey,
      },
      signers: [host],
    });

    // Verify the story was submitted
    const game = await program.account.game.fetch(gameAccount.publicKey);
    assert.strictEqual(game.story, story);
  });

  it('Participants submit their drawings', async () => {
    for (let i = 0; i < participants.length; i++) {
      const drawingRef = `drawing_${i}`;
      await program.rpc.submitDrawing(drawingRef, {
        accounts: {
          game: gameAccount.publicKey,
          participant: participants[i].publicKey,
        },
        signers: [participants[i]],
      });
    }

    // Verify all drawings were submitted
    const game = await program.account.game.fetch(gameAccount.publicKey);
    assert.strictEqual(game.drawings.length, participants.length);
  });

  it('Host selects the winning drawing', async () => {
    const winningDrawing = game.drawings[0].drawingRef; // Example: Select the first drawing as the winner
    await program.rpc.selectWinner(winningDrawing, {
      accounts: {
        game: gameAccount.publicKey,
        host: host.publicKey,
      },
      signers: [host],
    });

    // Verify the winning drawing was selected
    const game = await program.account.game.fetch(gameAccount.publicKey);
    assert.strictEqual(game.winningDrawing, winningDrawing);
  });
});
