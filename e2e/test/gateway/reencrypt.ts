import { expect } from "chai";
import { Context } from "mocha";

import { Reencrypt } from "../../types";
import { Decrypt, createDecrypt, createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";
import { deployReencryptFixture } from "./Reencrypt.fixture";

interface ReencryptContext extends Context {
  contract: Reencrypt;
}

describe("Test reencrypt", function () {
  let decrypt: Decrypt;
  before(async function (this: ReencryptContext) {
    await initSigners();
    this.signers = await getSigners();
    this.fhevm = await createInstance();
    const contract = await deployReencryptFixture();
    this.contractAddress = await contract.getAddress();
    this.contract = contract;
    decrypt = createDecrypt(this.fhevm, this.signers.alice, this.contractAddress);
  });

  it("should reencrypt a bool value", async function (this: ReencryptContext) {
    const handle = await this.contract.resultBool();

    const result = await decrypt(handle);
    expect(result).to.equal(1);
  });

  it("should reencrypt a 4bits value", async function (this: ReencryptContext) {
    const handle = await this.contract.result4();

    const result = await decrypt(handle);
    expect(result).to.equal(2);
  });

  it("should reencrypt a 8bits value", async function (this: ReencryptContext) {
    const handle = await this.contract.result8();

    const result = await decrypt(handle);
    expect(result).to.equal(4);
  });

  it("should reencrypt a 16bits value", async function (this: ReencryptContext) {
    const handle = await this.contract.result16();

    const result = await decrypt(handle);
    expect(result).to.equal(8);
  });

  it("should reencrypt a 32bits value", async function (this: ReencryptContext) {
    const handle = await this.contract.result32();

    const result = await decrypt(handle);
    expect(result).to.equal(16);
  });

  it("should reencrypt a 64bits value", async function (this: ReencryptContext) {
    const handle = await this.contract.result64();

    const result = await decrypt(handle);
    expect(result).to.equal(32);
  });

  it("should reencrypt a 128bits value", async function (this: ReencryptContext) {
    const handle = await this.contract.result128();

    const result = await decrypt(handle);
    expect(result).to.equal(64);
  });

  it("should reencrypt a 256bits value", async function (this: ReencryptContext) {
    const handle = await this.contract.result256();

    const result = await decrypt(handle);
    expect(result).to.equal(128);
  });

  it("should reencrypt a bytes64 value", async function (this: ReencryptContext) {
    const handle = await this.contract.resultEbytes64();

    const result = await decrypt(handle);
    expect(result).to.equal(
      BigInt(
        "0x19d179e0cc7e816dc944582ed4f5652f5951900098fc2e0a15a7ea4dc8cfa4e3b6c54beea5ee95e56b728762f659347ce1d4aa1b05fcc5",
      ),
    );
  });

  it("should reencrypt a bytes128 value", async function (this: ReencryptContext) {
    const handle = await this.contract.resultEbytes128();

    const result = await decrypt(handle);
    expect(result).to.equal(
      BigInt(
        "0x13e7819123de6e2870c7e83bb764508e22d7c3ab8a5aee6bdfb26355ef0d3f1977d651b83bf5f78634fa360aa14debdc3daa6a587b5c2fb1710ab4d6677e62a8577f2d9fecc190ad8b11c9f0a5ec3138b27da1f055437af8c90a9495dad230",
      ),
    );
  });

  it("should reencrypt a bytes256 value", async function (this: ReencryptContext) {
    const handle = await this.contract.resultEbytes256();

    const result = await decrypt(handle);
    expect(result).to.equal(
      BigInt(
        "0xd179e0cc7e816dc944582ed4f5652f5951900098fc2e0a15a7ea4dc8cfa4e3b6c54beea5ee95e56b728762f659347ce1d4aa1b05fcc513e7819123de6e2870c7e83bb764508e22d7c3ab8a5aee6bdfb26355ef0d3f1977d651b83bf5f78634fa360aa14debdc3daa6a587b5c2fb1710ab4d6677e62a8577f2d9fecc190ad8b11c9f0a5ec3138b27da1f055437af8c90a9495dad230",
      ),
    );
  });
});
