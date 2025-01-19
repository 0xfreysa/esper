//use std::process::Command;

fn main() {
    // Used to extract latest HEAD commit hash and timestamp for the /info endpoint
    // let output = Command::new("git")
    //     .args(["show", "HEAD", "-s", "--format=%H,%cI"])
    //     .output()
    //     .expect("Git command to get commit hash and timestamp should work during build process");

    // let output_string =
    //     String::from_utf8(output.stdout).expect("Git command should produce valid string output");

    // // Add debug prints
    // println!("cargo:warning=Output string: '{}'", output_string);
    // if !output.stderr.is_empty() {
    //     println!("cargo:warning=Stderr: '{}'", String::from_utf8_lossy(&output.stderr));
    // }

    // let (commit_hash, commit_timestamp) = output_string
    //     .as_str()
    //     .split_once(',')
    //     .expect("Git commit hash and timestamp string output should be comma separated");

    let commit_hash = "3fc79cc7db49596be0045a99c77945c325b7091a";
    let commit_timestamp = "2025-01-15T00:48:57-06:00";

    // Pass these 2 values as env var to the program
    println!("cargo:rustc-env=GIT_COMMIT_HASH={}", commit_hash);
    println!("cargo:rustc-env=GIT_COMMIT_TIMESTAMP={}", commit_timestamp);
}
