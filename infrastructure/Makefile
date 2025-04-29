TEMPLATE_FILE=template.yml
CAPABILITIES=CAPABILITY_IAM CAPABILITY_AUTO_EXPAND CAPABILITY_NAMED_IAM
REGION=us-east-1
PREFIX=storacha-bridge
ARTIFACT_NAME=storacha-bridge.zip
ARTIFACTS_BUCKET=artifacts.ow
STACK_NAME=storacha-bridge-infra

DEV_PARAMETERS_FILE=template-config.devel.json

deploy-infra-dev: PARAMETERS=$(shell jq -r '.Parameters | to_entries | map("\(.key)=\(.value)") | join(" ")' $(DEV_PARAMETERS_FILE))
deploy-infra-dev: 
	sam deploy --template-file $(TEMPLATE_FILE) --stack-name dev-$(STACK_NAME) --capabilities $(CAPABILITIES) --region $(REGION) --s3-bucket $(ARTIFACTS_BUCKET) --s3-prefix dev/$(PREFIX) --parameter-overrides $(PARAMETERS) --no-fail-on-empty-changeset

cleanup:
	rm -rf out && \
	rm -rf $(ARTIFACT_NAME)

storacha-bridge.zip: cleanup
	npm run esbuild && \
	find out/storacha-bridge -type f \( -name "*.js" -o -name "*.js.map" -o -name "*sentry_cpu_profiler-linux-x64-glibc*" \) \
	| zip $@ -@