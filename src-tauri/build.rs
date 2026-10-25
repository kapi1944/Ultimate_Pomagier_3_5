fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("android") {
        println!("cargo:rustc-link-arg=-Wl,-z,max-page-size=16384");
        println!("cargo:rustc-link-arg=-Wl,-z,common-page-size=16384");
    }
    if std::env::var_os("CARGO_FEATURE_DEMO_DESKTOP").is_some()
        && std::env::var("PROFILE").as_deref() == Ok("release")
    {
        panic!("Natywne DEMO jest zabronione w kompilacji produkcyjnej.");
    }
    tauri_build::build()
}
