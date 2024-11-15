with (import <nixpkgs> {});
mkShell {
	buildInputs = [
		cargo
		nodejs_22
	];
}
