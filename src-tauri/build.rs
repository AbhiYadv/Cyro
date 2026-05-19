fn main() {
    println!("cargo:rerun-if-changed=../index.html");
    println!("cargo:rerun-if-changed=../src");
    println!("cargo:rerun-if-changed=../dist");
    tauri_build::build()
}
