pub mod create_prompt_asset;
pub mod submit_inference_request;
pub mod record_inference_response;
pub mod verify_merkle_proof;
pub mod update_prompt_metadata;

// Re-export Accounts context structs only — not the `handler` functions, which
// share the same name across modules and would produce ambiguous glob re-exports.
// lib.rs calls handlers via their fully-qualified module path.
pub use create_prompt_asset::CreatePromptAsset;
pub use submit_inference_request::SubmitInferenceRequest;
pub use record_inference_response::RecordInferenceResponse;
pub use verify_merkle_proof::VerifyMerkleProof;
pub use update_prompt_metadata::UpdatePromptMetadata;
