fn main() {
    if std::env::var_os("CARGO_FEATURE_DEMO_DESKTOP").is_some()
        && std::env::var("PROFILE").as_deref() == Ok("release")
    {
        panic!("Natywne DEMO jest zabronione w kompilacji produkcyjnej.");
    }
    tauri_build::build()
}
