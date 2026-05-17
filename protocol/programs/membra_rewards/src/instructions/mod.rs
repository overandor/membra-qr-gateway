pub mod claim_rewards;
pub mod close_lock;
pub mod create_lock;
pub mod initialize_rewards;
pub mod stake;
pub mod unstake;

// Anchor's #[program] macro emits `crate::__client_accounts_<Struct>` paths,
// which requires the Accounts structs (and the generated __client_accounts_*
// companion types) to be visible at the crate root.  Glob re-exports are the
// conventional Anchor pattern for achieving this.
//
// Every instruction module defines a `handler` function, causing the
// `ambiguous_glob_reexports` lint to fire.  We suppress it here; lib.rs calls
// handlers via their fully-qualified module paths so there is no actual
// ambiguity at the call sites.
#[allow(ambiguous_glob_reexports)]
pub use claim_rewards::*;
#[allow(ambiguous_glob_reexports)]
pub use close_lock::*;
#[allow(ambiguous_glob_reexports)]
pub use create_lock::*;
#[allow(ambiguous_glob_reexports)]
pub use initialize_rewards::*;
#[allow(ambiguous_glob_reexports)]
pub use stake::*;
#[allow(ambiguous_glob_reexports)]
pub use unstake::*;
