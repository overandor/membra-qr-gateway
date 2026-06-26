use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

#[derive(Accounts)]
#[instruction(repo_owner_hash: [u8; 32], repo_name_hash: [u8; 32])]
pub struct RegisterRepoProof<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = RepoProof::LEN,
        seeds = [b"repo_proof", owner.key().as_ref(), &repo_owner_hash, &repo_name_hash],
        bump
    )]
    pub repo_proof: Account<'info, RepoProof>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn handler(
    ctx: Context<RegisterRepoProof>,
    repo_owner_hash: [u8; 32],
    repo_name_hash: [u8; 32],
    head_commit_hash: [u8; 32],
    file_tree_merkle_root: [u8; 32],
    ast_merkle_root: [u8; 32],
    dependency_fingerprint_hash: [u8; 32],
    test_trace_hash: [u8; 32],
    commit_count: u64,
    first_commit_unix: i64,
    last_commit_unix: i64,
    visibility_class: VisibilityClass,
) -> Result<()> {
    let proof = &mut ctx.accounts.repo_proof;
    let clock = Clock::get()?;

    proof.owner = ctx.accounts.owner.key();
    proof.repo_owner_hash = repo_owner_hash;
    proof.repo_name_hash = repo_name_hash;
    proof.head_commit_hash = head_commit_hash;
    proof.file_tree_merkle_root = file_tree_merkle_root;
    proof.ast_merkle_root = ast_merkle_root;
    proof.dependency_fingerprint_hash = dependency_fingerprint_hash;
    proof.test_trace_hash = test_trace_hash;
    proof.commit_count = commit_count;
    proof.first_commit_unix = first_commit_unix;
    proof.last_commit_unix = last_commit_unix;
    proof.visibility_class = visibility_class;
    proof.created_at = clock.unix_timestamp;
    proof.bump = ctx.bumps.repo_proof;

    emit!(RepoProofRegistered {
        owner: ctx.accounts.owner.key(),
        head_commit_hash,
        file_tree_merkle_root,
        commit_count,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
