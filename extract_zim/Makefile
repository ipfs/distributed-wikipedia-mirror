TARGET_BIN=extract_zim
all: $(TARGET_BIN)


CLEAN=$(TARGET_BIN) bin .crates.toml

cargo:
	@cargo -V > /dev/null 2>&1 || (echo 'You have to install cargo and Rust'; exit 1)
.PHONY: cargo

extract_zim: bin/extract_zim
	cp -f bin/extract_zim extract_zim

bin/extract_zim: cargo
	cargo install --force --bin extract_zim --rev c8c0e68d1bd96c4b5c45d27eafd778630ff42edf --git https://github.com/kanej/zim --root .

clean:
	rm -rf $(CLEAN)
.PHONY: clean
