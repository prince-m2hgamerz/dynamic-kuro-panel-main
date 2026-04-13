# C++ Client Integration Guide for /connect API

## Endpoints

```
POST https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/connect
Content-Type: application/json
```

### SDK Panel Endpoint

Use this URL for Java/package-name validation flow:

```
POST https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/sdk/panel/connect
Content-Type: application/x-www-form-urlencoded
```

---

## Authentication Modes

The API supports **three authentication modes** for different client requirements:

| Mode | When to Use | Headers Required | Security Level |
|------|-------------|------------------|----------------|
| **V2 HMAC-SHA256** | New clients (recommended) | `X-Time`, `X-Signature`, `X-Client-Version: V2` | 🔒 Highest |
| **V1 Static** | Legacy clients | `X-Client-Signature: SARKAR-CPP-V1` | 🔓 Medium |
| **Legacy MD5** | Very old clients | `X-Client-Signature` + `legacy: 1` | 🔓 Low |

---

## 🔥 V2 HMAC-SHA256 Authentication (RECOMMENDED)

This is the **most secure** method using time-based HMAC signatures that prevent replay attacks and request tampering.

### How It Works

```
┌─────────────────┐                           ┌─────────────────┐
│   C++ Client    │                           │     Server      │
├─────────────────┤                           ├─────────────────┤
│                 │                           │                 │
│ 1. timestamp = current_unix_time            │                 │
│ 2. body_hash = SHA256(request_body)         │                 │
│ 3. payload = timestamp:endpoint:body_hash   │                 │
│ 4. signature = HMAC_SHA256(SECRET, payload) │                 │
│                 │                           │                 │
│  Headers:       │                           │                 │
│  X-Time: 173761 │ ────────────────────────> │ 1. Check time ±30s
│  X-Signature: a8│                           │ 2. Rebuild signature
│  X-Client-Ver: V│                           │ 3. Compare hashes
│                 │ <──────────────────────── │ 4. Match = OK ✅
└─────────────────┘                           └─────────────────┘
```

### Required Headers

| Header | Example | Description |
|--------|---------|-------------|
| `X-Time` | `1737612345` | Current Unix timestamp (seconds) |
| `X-Signature` | `a8f9c2e4d7...` | HMAC-SHA256 hex signature (64 chars) |
| `X-Client-Version` | `V2` | Must be exactly `V2` |
| `Content-Type` | `application/json` | JSON payload |

### Signature Generation

```
signature = HMAC_SHA256(
    CLIENT_AUTH_SECRET,
    "{timestamp}:{endpoint}:{SHA256(request_body)}"
)
```

Example:
```
timestamp = 1737612345
endpoint = "connect"
body = {"game":"PUBG","user_key":"XXX","serial":"YYY"}
body_hash = SHA256(body) = "abc123..."
payload = "1737612345:connect:abc123..."
signature = HMAC_SHA256(SECRET, payload) = "def456..."
```

### C++ Implementation (V2 HMAC)

```cpp
#include <curl/curl.h>
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <nlohmann/json.hpp>
#include <ctime>
#include <sstream>
#include <iomanip>

// Shared secret (must match server's CLIENT_AUTH_SECRET)
const std::string SECRET = "your_secret_here";

// SHA-256 hash function
std::string Sha256(const std::string& message) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(message.c_str()), 
           message.length(), hash);
    
    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}

// HMAC-SHA256 function
std::string HmacSha256(const std::string& secret, const std::string& message) {
    unsigned char hash[32];
    unsigned int len = 32;
    
    HMAC(EVP_sha256(), 
         secret.c_str(), secret.length(),
         reinterpret_cast<const unsigned char*>(message.c_str()), 
         message.length(), 
         hash, &len);
    
    std::stringstream ss;
    for (unsigned int i = 0; i < len; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}

// Compute device serial (HWID)
std::string ComputeSerial(const std::string& user_key, 
                          const std::string& android_id,
                          const std::string& model,
                          const std::string& brand) {
    return Sha256(user_key + android_id + model + brand);
}

// CURL write callback
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append(static_cast<char*>(contents), size * nmemb);
    return size * nmemb;
}

// V2 HMAC Login (RECOMMENDED)
std::string Login_V2_HMAC(const char* user_key) {
    CURL* curl = curl_easy_init();
    if (!curl) return "CURL_INIT_FAILED";
    
    // Get device info
    std::string android_id = getAndroidId();  // Your implementation
    std::string model = getDeviceModel();      // Your implementation
    std::string brand = getDeviceBrand();      // Your implementation
    
    // Compute serial
    std::string serial = ComputeSerial(user_key, android_id, model, brand);
    
    // Build JSON payload
    nlohmann::json payload = {
        {"game", "PUBG"},
        {"user_key", user_key},
        {"serial", serial},
        {"device_info", {
            {"model", model},
            {"brand", brand},
            {"android_id", android_id}
        }}
    };
    std::string body = payload.dump();
    
    // ============================================
    // V2 HMAC SIGNATURE GENERATION
    // ============================================
    int64_t timestamp = static_cast<int64_t>(time(nullptr));
    std::string endpoint = "connect";
    std::string bodyHash = Sha256(body);
    std::string signaturePayload = std::to_string(timestamp) + ":" + endpoint + ":" + bodyHash;
    std::string signature = HmacSha256(SECRET, signaturePayload);
    
    // Build headers
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, ("X-Time: " + std::to_string(timestamp)).c_str());
    headers = curl_slist_append(headers, ("X-Signature: " + signature).c_str());
    headers = curl_slist_append(headers, "X-Client-Version: V2");
    
    // Setup CURL
    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, 
        "https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/connect");
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
    
    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        return std::string("NETWORK_ERROR: ") + curl_easy_strerror(res);
    }
    
    // Parse response
    try {
        auto json = nlohmann::json::parse(response);
        
        if (json["status"].get<bool>()) {
            auto& data = json["data"];
            // Success! Extract license data
            std::string modName = data["mod_name"].get<std::string>();
            std::string expiry = data["expiry"].get<std::string>();
            int daysRemaining = data["days_remaining"].get<int>();
            return "OK";
        } else {
            return json.value("reason", "UNKNOWN_ERROR");
        }
    } catch (const std::exception& e) {
        return std::string("PARSE_ERROR: ") + e.what();
    }
}
```

### Security Features of V2

| Feature | Protection |
|---------|------------|
| Time-based signature | Replay attacks blocked (±30s window) |
| Body hash in signature | Request tampering detected |
| Endpoint in signature | Endpoint abuse prevented |
| HMAC-SHA256 | Cryptographically secure |

---

## V1 Static Signature (Legacy Support)

For existing clients that use the static `X-Client-Signature` header.

### Required Header

```cpp
headers = curl_slist_append(headers, "X-Client-Signature: SARKAR-CPP-V1");
```

**Note:** V1 will be deprecated after 30-day transition period. Please migrate to V2.

### C++ Implementation (V1 Static)

```cpp
// V1 Static Signature Login (LEGACY)
std::string Login_V1(const char* user_key) {
    CURL* curl = curl_easy_init();
    if (!curl) return "CURL_INIT_FAILED";
    
    // Build JSON payload
    nlohmann::json payload = {
        {"game", "PUBG"},
        {"user_key", user_key},
        {"serial", ComputeSerial(...)},
        {"device_info", {...}}
    };
    std::string body = payload.dump();
    
    // V1 headers (static signature)
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, "X-Client-Signature: SARKAR-CPP-V1");  // Static
    
    // ... rest of CURL setup same as V2 ...
}
```

---

## Request Format

```json
{
  "game": "PUBG",
  "user_key": "XXXX-XXXX-XXXX-XXXX",
  "serial": "a1b2c3d4e5f6789...64_char_sha256_hex",
  "legacy": 1,
  "device_info": {
    "model": "SM-G998B",
    "brand": "samsung",
    "android_id": "abc123def456"
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `game` | string | ✅ | Game name (use `"PUBG"` for legacy clients) |
| `user_key` | string | ✅ | License key code |
| `serial` | string | ✅ | SHA-256 hash of HWID |
| `legacy` | number | ❌ | Set to `1` for legacy MD5 mode |
| `device_info` | object | ❌ | Optional device metadata |

---

## Response Format

### Success Response

```json
{
  "status": true,
  "reason": null,
  "data": {
    "token": "a1b2c3d4e5f6...",
    "game_name": "PUBG",
    "mod_name": "PUBG Mod",
    "expiry": "2026-02-23T00:00:00.000Z",
    "days_remaining": 30,
    "remaining_seconds": 2592000,
    "max_devices": 3,
    "current_devices": 1,
    "rng": 1737612345,
    "EXP": "30 days",
    "ts": "2026-02-23",
    "ms": "active",
    "fAVA": "active"
  }
}
```

### Error Response

```json
{
  "status": false,
  "reason": "ACCESS_DENIED",
  "message": "Unable to process request"
}
```

### Error Codes

| Reason Code | HTTP | Description |
|-------------|------|-------------|
| `ACCESS_DENIED` | 403 | Missing/invalid signature headers |
| `TIMESTAMP_EXPIRED` | 403 | V2 timestamp outside ±30s window |
| `INVALID_SIGNATURE` | 403 | V2 HMAC signature mismatch |
| `RATE_LIMITED` | 429 | Too many requests |
| `BLOCKED` | 403 | IP blacklisted |

---

## Serial Derivation

The `serial` field is computed as:

```
serial = SHA256(user_key + android_id + model + brand)
```

See V2 implementation above for `ComputeSerial()` function.

---

## Migration Guide: V1 → V2

### Step 1: Add HMAC Functions

Add `Sha256()` and `HmacSha256()` functions (see V2 implementation).

### Step 2: Update Headers

```cpp
// BEFORE (V1)
headers = curl_slist_append(headers, "X-Client-Signature: SARKAR-CPP-V1");

// AFTER (V2)
int64_t timestamp = time(nullptr);
std::string bodyHash = Sha256(body);
std::string payload = std::to_string(timestamp) + ":connect:" + bodyHash;
std::string signature = HmacSha256(SECRET, payload);

headers = curl_slist_append(headers, ("X-Time: " + std::to_string(timestamp)).c_str());
headers = curl_slist_append(headers, ("X-Signature: " + signature).c_str());
headers = curl_slist_append(headers, "X-Client-Version: V2");
```

### Step 3: Ensure Time Sync

V2 requires client time to be within ±30 seconds of server time. Use NTP if needed.

---

## Testing

### Test V2 HMAC (requires valid signature)

```bash
# Generate signature in code, then:
curl -X POST \
  https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/connect \
  -H "Content-Type: application/json" \
  -H "X-Time: $(date +%s)" \
  -H "X-Signature: YOUR_COMPUTED_SIGNATURE" \
  -H "X-Client-Version: V2" \
  -d '{"game":"PUBG","user_key":"TEST","serial":"abc123"}'
```

### Test V1 Static (legacy)

```bash
curl -X POST \
  https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/connect \
  -H "Content-Type: application/json" \
  -H "X-Client-Signature: SARKAR-CPP-V1" \
  -d '{"game":"PUBG","user_key":"TEST","serial":"abc123"}'
```

---

## Security Comparison

| Feature | V1 Static | V2 HMAC |
|---------|-----------|---------|
| Replay Attack Protection | ❌ None | ✅ 30s window |
| Request Tampering Detection | ❌ None | ✅ Body hash |
| Endpoint Abuse Prevention | ❌ None | ✅ Endpoint in sig |
| Token Leak Risk | ⚠️ High (static) | ✅ None (dynamic) |
| Algorithm | None | HMAC-SHA256 |

---

## Dependencies

### Android NDK

```cmake
# CMakeLists.txt
find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)

target_link_libraries(${PROJECT_NAME}
    OpenSSL::SSL
    OpenSSL::Crypto
    CURL::libcurl
)
```

### Windows (vcpkg)

```bash
vcpkg install openssl:x64-windows
vcpkg install curl:x64-windows
vcpkg install nlohmann-json:x64-windows
```

---

## Android JNI Implementation (Full Example)

This section contains the complete Android NDK/JNI-based implementation with device fingerprinting, clipboard access, and the Login function using libcurl.

### Clipboard Access

```cpp
std::string getClipboardText() {
    if (!g_App)
        return "";

    auto activity = g_App->activity;
    if (!activity)
        return "";

    auto vm = activity->vm;
    if (!vm)
        return "";

    auto object = activity->clazz;
    if (!object)
        return "";

    std::string result;

    JNIEnv *env;
    vm->AttachCurrentThread(&env, 0);
    {
        auto ContextClass = env->FindClass("android/content/Context");
        auto getSystemServiceMethod = env->GetMethodID(ContextClass, "getSystemService", "(Ljava/lang/String;)Ljava/lang/Object;");

        auto str = env->NewStringUTF("clipboard");
        auto clipboardManager = env->CallObjectMethod(object, getSystemServiceMethod, str);
        env->DeleteLocalRef(str);

        auto ClipboardManagerClass = env->FindClass("android/content/ClipboardManager");
        auto getText = env->GetMethodID(ClipboardManagerClass, "getText", "()Ljava/lang/CharSequence;");

        auto CharSequenceClass = env->FindClass("java/lang/CharSequence");
        auto toStringMethod = env->GetMethodID(CharSequenceClass, "toString", "()Ljava/lang/String;");

        auto text = env->CallObjectMethod(clipboardManager, getText);
        if (text) {
            str = (jstring) env->CallObjectMethod(text, toStringMethod);
            result = env->GetStringUTFChars(str, 0);
            env->DeleteLocalRef(str);
            env->DeleteLocalRef(text);
        }

        env->DeleteLocalRef(CharSequenceClass);
        env->DeleteLocalRef(ClipboardManagerClass);
        env->DeleteLocalRef(clipboardManager);
        env->DeleteLocalRef(ContextClass);
    }
    vm->DetachCurrentThread();

    return result;
}
```

### Device Fingerprinting (JNI Helpers)

```cpp
const char *GetAndroidID(JNIEnv *env, jobject context) {
    jclass contextClass = env->FindClass("android/content/Context");
    jmethodID getContentResolverMethod = env->GetMethodID(contextClass, "getContentResolver", "()Landroid/content/ContentResolver;");
    jclass settingSecureClass = env->FindClass("android/provider/Settings$Secure");
    jmethodID getStringMethod = env->GetStaticMethodID(settingSecureClass, "getString", "(Landroid/content/ContentResolver;Ljava/lang/String;)Ljava/lang/String;");

    auto obj = env->CallObjectMethod(context, getContentResolverMethod);
    auto str = (jstring) env->CallStaticObjectMethod(settingSecureClass, getStringMethod, obj, env->NewStringUTF("android_id"));
    return env->GetStringUTFChars(str, 0);
}

const char *GetDeviceModel(JNIEnv *env) {
    jclass buildClass = env->FindClass("android/os/Build");
    jfieldID modelId = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
    auto str = (jstring) env->GetStaticObjectField(buildClass, modelId);
    return env->GetStringUTFChars(str, 0);
}

const char *GetDeviceBrand(JNIEnv *env) {
    jclass buildClass = env->FindClass("android/os/Build");
    jfieldID modelId = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
    auto str = (jstring) env->GetStaticObjectField(buildClass, modelId);
    return env->GetStringUTFChars(str, 0);
}

const char *GetPackageName(JNIEnv *env, jobject context) {
    jclass contextClass = env->FindClass("android/content/Context");
    jmethodID getPackageNameId = env->GetMethodID(contextClass, "getPackageName", "()Ljava/lang/String;");
    auto str = (jstring) env->CallObjectMethod(context, getPackageNameId);
    return env->GetStringUTFChars(str, 0);
}

const char *GetDeviceUniqueIdentifier(JNIEnv *env, const char *uuid) {
    jclass uuidClass = env->FindClass("java/util/UUID");
    auto len = strlen(uuid);
    jbyteArray myJByteArray = env->NewByteArray(len);
    env->SetByteArrayRegion(myJByteArray, 0, len, (jbyte *) uuid);

    jmethodID nameUUIDFromBytesMethod = env->GetStaticMethodID(uuidClass, "nameUUIDFromBytes", "([B)Ljava/util/UUID;");
    jmethodID toStringMethod = env->GetMethodID(uuidClass, "toString", "()Ljava/lang/String;");

    auto obj = env->CallStaticObjectMethod(uuidClass, nameUUIDFromBytesMethod, myJByteArray);
    auto str = (jstring) env->CallObjectMethod(obj, toStringMethod);
    return env->GetStringUTFChars(str, 0);
}
```

### CURL Memory Callback

```cpp
struct MemoryStruct {
    char *memory;
    size_t size;
};

static size_t WriteMemoryCallback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    struct MemoryStruct *mem = (struct MemoryStruct *) userp;

    mem->memory = (char *) realloc(mem->memory, mem->size + realsize + 1);
    if (mem->memory == NULL) {
        return 0;
    }

    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}
```

### Login Function (with SSL Pinning & Obfuscation)

> **Note:** In production builds, use string encryption (StrEnc/OBFUSCATE) macros to protect URLs, headers, and keys from static analysis. The example below shows the readable version.

```cpp
std::string Login(const char *userKey) {
    if (!g_App)
        return "Internal Error";

    auto activity = g_App->activity;
    if (!activity)
        return "Internal Error";

    auto vm = activity->vm;
    if (!vm)
        return "Internal Error";

    auto object = activity->clazz;
    if (!object)
        return "Internal Error";

    JNIEnv *env;
    vm->AttachCurrentThread(&env, 0);
    std::string hwid = userKey;
    hwid += GetAndroidID(env, object);
    hwid += GetDeviceModel(env);
    hwid += GetDeviceBrand(env);
    std::string UUID = GetDeviceUniqueIdentifier(env, hwid.c_str());
    vm->DetachCurrentThread();
    std::string errMsg;

    struct MemoryStruct chunk{};
    chunk.memory = (char *) malloc(1);
    chunk.size = 0;

    CURL *curl;
    CURLcode res;
    curl = curl_easy_init();

    if (curl) {
        // API endpoint (use OBFUSCATE macro in production)
        std::string url = "https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/connect";

        // SSL Certificate Pinning for anti-MITM protection
        curl_easy_setopt(curl, CURLOPT_PINNEDPUBLICKEY, 
            "sha256//C/yvYpMUatsDUe02rfnVxIoe/hVtVpRAd9mB0Lm9hPU=");

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_DEFAULT_PROTOCOL, "https");

        // Auth header (use StrEnc in production)
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        headers = curl_slist_append(headers, "X-Auth-Secret: YOUR_AUTH_SECRET_HERE");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        // Build JSON payload
        char data[4096];
        sprintf(data, "{\"key\":\"%s\",\"hwid\":\"%s\"}", userKey, UUID.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *) &chunk);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);

        res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            try {
                json result = json::parse(chunk.memory);
                if (result["status"] == true) {
                    std::string token = result["data"]["token"].get<std::string>();
                    time_t rng = result["data"]["rng"].get<time_t>();
                    EXP = result["data"]["EXP"].get<std::string>();

                    if (rng + 30 > time(0)) {
                        g_Token = "1";
                        g_Auth = "1";
                        bValid = g_Token == g_Auth;
                    }
                } else {
                    errMsg = result["reason"].get<std::string>();
                }
            } catch (json::exception &e) {
                errMsg = "{";
                errMsg += e.what();
                errMsg += "}\n{";
                errMsg += chunk.memory;
                errMsg += "}";
            }
        } else {
            errMsg = curl_easy_strerror(res);
        }
    }
    curl_easy_cleanup(curl);
    vm->DetachCurrentThread();

    return bValid ? "OK" : errMsg;
}
```

### SSL Certificate Pinning

The `CURLOPT_PINNEDPUBLICKEY` option pins the server's public key hash to prevent MITM attacks:

```cpp
curl_easy_setopt(curl, CURLOPT_PINNEDPUBLICKEY, 
    "sha256//C/yvYpMUatsDUe02rfnVxIoe/hVtVpRAd9mB0Lm9hPU=");
```

> ⚠️ **Important:** If the server's SSL certificate changes, this hash must be updated in your client build. The current pinned hash is for the Sarkar API endpoint.

---

## Troubleshooting

### Error: TIMESTAMP_EXPIRED

- Check if device time is synchronized (use NTP)
- Ensure you're sending current Unix timestamp, not milliseconds

### Error: INVALID_SIGNATURE

- Verify SECRET matches server's CLIENT_AUTH_SECRET
- Check signature payload format: `{timestamp}:{endpoint}:{body_hash}`
- Ensure body is serialized exactly the same way before hashing

### Error: ACCESS_DENIED (V1)

- Check `X-Client-Signature` header is present
- Verify signature value is exactly `SARKAR-CPP-V1`

### Error: SSL Pinning Failure

- The pinned public key hash may have changed due to certificate rotation
- Update the `CURLOPT_PINNEDPUBLICKEY` value with the new hash
- Use `openssl s_client -connect host:443` to extract the current public key
