prog := notary-server
version := $(shell git describe --tag --dirty --always)
image_tag := $(prog)
image_tar := $(prog)-kaniko.tar
image_eif := $(image_tar:%.tar=%.eif)

ARCH ?= $(shell uname -m)
ifeq ($(ARCH),aarch64)
	override ARCH=arm64
endif
ifeq ($(ARCH),x86_64)
	override ARCH=amd64
endif

.PHONY: all
all: run

.PHONY: image
image: $(image_tar)

$(image_tar): Dockerfile  start.sh ../providers.json
	cp ../providers.json . && \
	docker run \
		-v $(PWD):/workspace \
		gcr.io/kaniko-project/executor:v1.9.2 \
		--reproducible \
		--no-push \
		--tarPath $(image_tar) \
		--destination $(image_tag) \
		--build-arg TARGETPLATFORM=linux/$(ARCH) \
		--build-arg TARGETOS=linux \
		--build-arg TARGETARCH=$(ARCH) \
		--custom-platform linux/$(ARCH)

$(image_eif): $(image_tar)
	docker load -i $<
	nitro-cli build-enclave \
		--docker-uri $(image_tag) \
		--output-file $(image_eif)

.PHONY: run
run: $(image_eif)
	# Terminate already-running enclave.
	nitro-cli terminate-enclave --all
	# Start our proxy and the enclave.
	./run-enclave.sh $(image_eif)

.PHONY: clean
clean:
	sudo rm -f *.eif *.tar
