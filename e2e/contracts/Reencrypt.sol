// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.24;

import { E2EFHEVMConfig } from "./E2EFHEVMConfig.sol";
import "fhevm/lib/TFHE.sol";

contract Reencrypt is E2EFHEVMConfig {
    ebool public resultBool;
    euint4 public result4;
    euint8 public result8;
    euint16 public result16;
    euint32 public result32;
    euint64 public result64;
    euint128 public result128;
    euint256 public result256;
    ebytes64 public resultEbytes64;
    ebytes128 public resultEbytes128;
    ebytes256 public resultEbytes256;

    constructor() {
        resultBool = TFHE.asEbool(true);
        TFHE.allowThis(resultBool);
        TFHE.allow(resultBool, msg.sender);

        result4 = TFHE.asEuint4(2);
        TFHE.allowThis(result4);
        TFHE.allow(result4, msg.sender);

        result8 = TFHE.asEuint8(4);
        TFHE.allowThis(result8);
        TFHE.allow(result8, msg.sender);

        result16 = TFHE.asEuint16(8);
        TFHE.allowThis(result16);
        TFHE.allow(result16, msg.sender);

        result32 = TFHE.asEuint32(16);
        TFHE.allowThis(result32);
        TFHE.allow(result32, msg.sender);

        result64 = TFHE.asEuint64(32);
        TFHE.allowThis(result64);
        TFHE.allow(result64, msg.sender);

        result128 = TFHE.asEuint128(64);
        TFHE.allowThis(result128);
        TFHE.allow(result128, msg.sender);

        result256 = TFHE.asEuint256(128);
        TFHE.allowThis(result256);
        TFHE.allow(result256, msg.sender);

        // resultEbytes64 = TFHE.asEbytes64(TFHE.padToBytes64("0x100"));
        resultEbytes64 = TFHE.asEbytes64(
            TFHE.padToBytes64(
                hex"19d179e0cc7e816dc944582ed4f5652f5951900098fc2e0a15a7ea4dc8cfa4e3b6c54beea5ee95e56b728762f659347ce1d4aa1b05fcc5"
            )
        );
        TFHE.allowThis(resultEbytes64);
        TFHE.allow(resultEbytes64, msg.sender);

        resultEbytes128 = TFHE.asEbytes128(
            TFHE.padToBytes128(
                hex"13e7819123de6e2870c7e83bb764508e22d7c3ab8a5aee6bdfb26355ef0d3f1977d651b83bf5f78634fa360aa14debdc3daa6a587b5c2fb1710ab4d6677e62a8577f2d9fecc190ad8b11c9f0a5ec3138b27da1f055437af8c90a9495dad230"
            )
        );
        TFHE.allowThis(resultEbytes128);
        TFHE.allow(resultEbytes128, msg.sender);

        resultEbytes256 = TFHE.asEbytes256(
            TFHE.padToBytes256(
                hex"d179e0cc7e816dc944582ed4f5652f5951900098fc2e0a15a7ea4dc8cfa4e3b6c54beea5ee95e56b728762f659347ce1d4aa1b05fcc513e7819123de6e2870c7e83bb764508e22d7c3ab8a5aee6bdfb26355ef0d3f1977d651b83bf5f78634fa360aa14debdc3daa6a587b5c2fb1710ab4d6677e62a8577f2d9fecc190ad8b11c9f0a5ec3138b27da1f055437af8c90a9495dad230"
            )
        );
        TFHE.allowThis(resultEbytes256);
        TFHE.allow(resultEbytes256, msg.sender);
    }
}
