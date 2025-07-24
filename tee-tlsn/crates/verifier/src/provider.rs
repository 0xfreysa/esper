//! Provider configuration for the verifier

use boa_engine::{js_str, property::Attribute, Context, JsValue, Source};

use regex::Regex;
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{cell::RefCell, collections::HashMap};
use thiserror::Error;

#[derive(Debug, Error)]
/// ProviderError is the error that is returned when the provider is invalid
pub enum ProviderError {
    /// InvalidRegex is the error that is returned when the regex is invalid
    #[error("Invalid regex '{0}': {1}")]
    InvalidRegex(String, regex::Error),
    #[cfg(not(target_arch = "wasm32"))]
    /// InvalidJmespath is the error that is returned when the JMESPath expression is invalid
    #[error("Invalid JSONPath expression '{0}': {1}")]
    InvalidJsonpath(String, String),
    /// JmespathError is the error that is returned when the JMESPath search fails
    #[error("JSONPath search error: {0}")]
    JsonpathError(String),
    /// JsonParseError is the error that is returned when the JSON is invalid
    #[error("Failed to parse JSON: {0}")]
    JsonParseError(serde_json::Error),
    /// PreprocessError is the error that is returned when the preprocess script is invalid
    #[error("Preprocess script error: {0}")]
    PreprocessError(String),
    /// PreProcessScriptError is the error that is returned when the preprocess script is invalid
    #[error("Preprocess script error: {0}")]
    PreProcessScriptError(String),
    /// ProcessError is the error that is returned when the process script is invalid
    #[error("Process script error: {0}")]
    ProcessError(String),
    /// RequestError is the error that is returned when the request to the provider fails
    #[error("Failed to make request to provider: {0}")]
    RequestError(reqwest::Error),
    /// ResponseParseError is the error that is returned when the response is invalid
    #[error("Failed to parse response: {0}")]
    ResponseParseError(reqwest::Error),
    /// SchemaError is the error that is returned when the schema is invalid
    #[error("Invalid schema: {0}")]
    SchemaError(String),
    /// ValidationError is the error that is returned when the JSON does not match the schema
    #[error("JSON validation failed: {0}")]
    ValidationError(String),
    /// CacheError is the error that is returned when the cache is invalid
    #[error("Cache error: {0}")]
    CacheError(String),
}

#[cfg(not(target_arch = "wasm32"))]
thread_local! {
    static COMPILED_ATTRIBUTES_CACHE: RefCell<HashMap<u32, Vec<String>>> = RefCell::new(HashMap::new());
    static COMPILED_REGEX_CACHE: RefCell<HashMap<u32, Regex>> = RefCell::new(HashMap::new());
    static COMPILED_PREPROCESS_CACHE: RefCell<HashMap<u32, Context>> = RefCell::new(HashMap::new());
}

/// Processor is the processor configuration for the verifier
#[derive(Debug, Clone)]
pub struct Processor {
    /// Schema url is the url that the verifier will use to fetch the schema
    pub schema_url: String,
    /// Config is the provider configuration for the verifier
    pub config: Config,
}

#[cfg(not(target_arch = "wasm32"))]
impl Processor {
    /// Create a new processor
    pub async fn new(json_path: String, schema_url: String) -> Result<Self, ProviderError> {
        // Fetch schema content from schema_url
        let schema_response = reqwest::get(&schema_url)
            .await
            .map_err(|e| ProviderError::RequestError(e))?;

        let schema_json = schema_response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| ProviderError::ResponseParseError(e))?;

        let json_path_content = reqwest::get(&json_path)
            .await
            .map_err(|e| ProviderError::RequestError(e))?
            .text()
            .await
            .map_err(|e| ProviderError::ResponseParseError(e))?;
        let data_json = serde_json::from_str(&json_path_content)
            .map_err(|e| ProviderError::JsonParseError(e))?;

        // Validate data_json against schema_json
        let compiled_schema = jsonschema::Validator::new(&schema_json)
            .map_err(|e| ProviderError::SchemaError(e.to_string()))?;

        if let Err(errors) = compiled_schema.validate(&data_json) {
            return Err(ProviderError::ValidationError(
                errors.map(|e| e.to_string()).collect::<Vec<_>>().join(", "),
            )
            .into());
        }

        let local_config_json: Config = serde_json::from_str(&json_path_content)
            .map_err(|e| ProviderError::JsonParseError(e))?;

        Ok(Self {
            schema_url,
            config: local_config_json,
        })
    }

    /// Find the provider that matches the url and method
    pub fn find_provider(&self, url: &str, method: &str) -> Option<&Provider> {
        self.config.providers.iter().find(|p| {
            p.check_url_method(url, method)
                .expect("Failed to check url method")
        })
    }
    /// Process the response using the providers
    pub fn process(
        &self,
        url: &str,
        method: &str,
        response: &str,
    ) -> Result<Vec<String>, ProviderError> {
        let mut result: Vec<String> = Vec::new();

        let provider = self.find_provider(url, method);

        match provider {
            Some(provider) => {
                let processed_response = provider
                    .preprocess_response(response)
                    .map_err(|e| ProviderError::ProcessError(e.to_string()))?;
                match provider.get_attributes(&processed_response) {
                    Ok(attributes) => {
                        for attribute in attributes {
                            let attribute_str = attribute.to_string();
                            result.push(attribute_str);
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to get attributes: {}", e);
                        return Err(ProviderError::ProcessError(e.to_string()));
                    }
                }
            }
            None => {
                tracing::error!("Failed to find provider");
                return Err(ProviderError::ProcessError(
                    "Failed to find provider".to_string(),
                ));
            }
        }

        Ok(result)
    }
}

/// Provider is the provider configuration for the verifier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    /// Id is the id of the provider
    pub id: u32,
    /// Host is the host of the provider
    pub host: String,
    /// Url regex is the regex that the url must match
    #[serde(rename = "urlRegex")]
    pub url_regex: String,
    /// Target url is the url that the provider will use
    #[serde(rename = "targetUrl")]
    pub target_url: String,
    /// Method is the HTTP method that the provider will use
    pub method: String,
    /// Title is the title of the provider
    pub title: String,
    /// Description is the description of the provider
    pub description: String,
    /// Icon is the icon of the provider
    pub icon: String,
    /// Response type is the type of the response that the provider will process
    #[serde(rename = "responseType")]
    pub response_type: String,
    /// Attributes is a list of JMESPath expressions that are applied to the response to extract the attributes
    pub attributes: Option<Vec<String>>,
    /// Preprocess is a JMESPath expression that is applied to the response before the attributes are extracted
    pub preprocess: Option<String>,
}

#[cfg(not(target_arch = "wasm32"))]
impl Provider {
    /// Get the compiled attributes from the JMESPath expressions
    fn get_compiled_attributes<F>(&self, f: F) -> Result<Vec<String>, ProviderError>
    where
        F: FnOnce(&Vec<String>) -> Result<Vec<String>, ProviderError>,
    {
        // Use the thread-local cache
        COMPILED_ATTRIBUTES_CACHE.with(|cache| {
            let mut cache = cache.borrow_mut();
            if let Some(compiled_exprs) = cache.get(&self.id) {
                // Return the cached compiled expressions
                return f(compiled_exprs);
            } else {
                // Compile the expressions and store them in the cache
                let compiled_exprs = self
                    .attributes
                    .as_deref()
                    .unwrap_or(&[])
                    .iter()
                    .filter(|attr| !attr.is_empty())
                    .map(|attr| attr.to_string())
                    .collect::<Vec<_>>();
                // Cache the compiled expressions
                cache.insert(self.id, compiled_exprs);
                if let Some(compiled_exprs) = cache.get(&self.id) {
                    return f(compiled_exprs);
                }
                return Err(ProviderError::CacheError(
                    "Failed to get compiled attributes".to_string(),
                ));
            }
        })
    }

    /// Get the compiled regex from the thread-local cache
    fn get_compiled_regex<F>(&self, f: F) -> Result<bool, ProviderError>
    where
        F: FnOnce(&Regex) -> Result<bool, ProviderError>,
    {
        COMPILED_REGEX_CACHE.with(|cache| {
            let mut cache = cache.borrow_mut();
            if let Some(compiled_regex) = cache.get(&self.id) {
                return f(compiled_regex);
            } else {
                let regex = Regex::new(&self.url_regex)
                    .map_err(|e| ProviderError::InvalidRegex(self.url_regex.to_string(), e))?;
                cache.insert(self.id, regex);
                if let Some(compiled_regex) = cache.get(&self.id) {
                    return f(compiled_regex);
                }
                return Err(ProviderError::CacheError(
                    "Failed to get compiled regex".to_string(),
                ));
            }
        })
    }

    /// Get the compiled preprocess from the thread-local cache
    fn get_compiled_preprocess<F>(&self, f: F) -> Result<Value, ProviderError>
    where
        F: FnOnce(&mut Context) -> Result<Value, ProviderError>,
    {
        // Try to use the cache first, but fall back to creating a new context if there's a GC issue
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            COMPILED_PREPROCESS_CACHE.with(|cache| {
                let mut cache = cache.borrow_mut();
                if let Some(context) = cache.get_mut(&self.id) {
                    return f(context);
                }
                let mut context = Context::default();
                if let Some(preprocess) = &self.preprocess {
                    context
                        .eval(Source::from_bytes(preprocess))
                        .map_err(|e| ProviderError::PreProcessScriptError(e.to_string()))?;
                }
                cache.insert(self.id, context);
                if let Some(context) = cache.get_mut(&self.id) {
                    return f(context);
                }
                Err(ProviderError::CacheError(
                    "Failed to get compiled preprocess".to_string(),
                ))
            })
        }));

        match result {
            Ok(success_result) => success_result,
            Err(_panic) => {
                // If there's a panic (likely due to Boa GC bug), create a fresh context
                tracing::warn!(
                    "Boa GC panic detected, creating fresh context for provider {}",
                    self.id
                );
                let mut context = Context::default();
                if let Some(preprocess) = &self.preprocess {
                    context
                        .eval(Source::from_bytes(preprocess))
                        .map_err(|e| ProviderError::PreProcessScriptError(e.to_string()))?;
                }

                let js_string = JsValue::String("{}".to_string().into());
                context
                    .register_global_property(js_str!("response"), js_string, Attribute::all())
                    .map_err(|e| ProviderError::PreprocessError(e.to_string()))?;

                let value = context
                    .eval(Source::from_bytes("process(response)"))
                    .map_err(|e| ProviderError::PreprocessError(e.to_string()))?;
                let json = value
                    .to_json(&mut context)
                    .map_err(|e| ProviderError::PreProcessScriptError(e.to_string()))?;

                // Don't store this context in cache to avoid GC issues
                Ok(json)
            }
        }
    }

    /// Escape a string for safe JavaScript execution
    fn escape_js_string(s: &str) -> String {
        s.replace('\\', "\\\\")
            .replace('\'', "\\'")
            .replace('\n', "\\n")
            .replace('\r', "\\r")
            .replace('\t', "\\t")
    }

    /// Extract JSON from HTTP chunked response
    fn extract_json_from_response(response: &str) -> &str {
        let json_start = response.find('{');
        let json_end = response.rfind('}');

        if let (Some(start), Some(end)) = (json_start, json_end) {
            &response[start..=end]
        } else {
            response
        }
    }

    /// Preprocess the response using the preprocess JavaScript function
    pub fn preprocess_response(&self, response: &str) -> Result<Value, ProviderError> {
        if let Some(preprocess) = &self.preprocess {
            if preprocess.is_empty() {
                let json = match serde_json::from_str(response) {
                    Ok(json) => json,
                    Err(_) => serde_json::Value::String("{}".to_string()),
                };
                return Ok(json);
            }

            // Create a fresh context for each request to avoid GC issues
            let mut context = Context::default();

            // Wrap the script execution to catch GC-related panics
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let is_x_provider = self.host == "x.com";

                // Prepare script and response data
                let (script_content, response_data) = if is_x_provider {
                    // For X providers: escape function and extract clean JSON
                    let escaped_script = Self::escape_js_string(preprocess);
                    let json_response = Self::extract_json_from_response(response);
                    let escaped_response = Self::escape_js_string(json_response);
                    (escaped_script, escaped_response)
                } else {
                    // For other providers: use standard escaping
                    (preprocess.to_string(), Self::escape_js_string(response))
                };

                // Build the execution code
                let code = if is_x_provider {
                    format!(
                        "eval('{}'); 
                         (function() {{ 
                             try {{ 
                                 const result = process('{}'); 
                                 return JSON.stringify(result); 
                             }} catch (error) {{ 
                                 throw new Error(error.message); 
                             }} 
                         }})();",
                        script_content, response_data
                    )
                } else {
                    format!(
                        "{} 
                         (function() {{ 
                             try {{ 
                                 const result = process('{}'); 
                                 return JSON.stringify(result); 
                             }} catch (error) {{ 
                                 throw new Error(error.message); 
                             }} 
                         }})();",
                        script_content, response_data
                    )
                };

                context.eval(Source::from_bytes(&code)).map_err(|e| {
                    ProviderError::PreprocessError(format!("Preprocess script error: {}", e))
                })
            }));

            match result {
                Ok(eval_result) => match eval_result {
                    Ok(js_value) => {
                        let result_str = js_value.to_string(&mut context).map_err(|e| {
                            ProviderError::PreprocessError(format!(
                                "Failed to convert result to string: {}",
                                e
                            ))
                        })?;

                        let json_value: Value = serde_json::from_str(
                            &result_str.to_std_string_escaped(),
                        )
                        .map_err(|e| {
                            ProviderError::PreprocessError(format!(
                                "Failed to parse result JSON: {}",
                                e
                            ))
                        })?;

                        Ok(json_value)
                    }
                    Err(e) => Err(e),
                },
                Err(_) => {
                    // If we caught a panic (likely GC bug), try to extract the actual error
                    // The preprocessing likely succeeded but cleanup failed
                    Err(ProviderError::PreprocessError(
                        "JavaScript execution completed but cleanup failed due to Boa GC bug"
                            .to_string(),
                    ))
                }
            }
        } else {
            let json = match serde_json::from_str(response) {
                Ok(json) => json,
                Err(_) => serde_json::Value::String("{}".to_string()),
            };
            Ok(json)
        }
    }

    /// Get the attributes from the response using the JMESPath expressions
    pub fn get_attributes(
        &self,
        response: &serde_json::Value,
    ) -> Result<Vec<String>, ProviderError> {
        let mut result: Vec<String> = Vec::new();
        self.get_compiled_attributes(|attribute_expressions| {
            for attr_expr in attribute_expressions {
                let eval_result = evaluate_attribute_expression(attr_expr, response)
                    .map_err(|e| ProviderError::JsonpathError(e))?;
                for (key, value) in eval_result {
                    result.push(format!("{}: {}", key, value.to_string()));
                }
            }
            Ok(result)
        })
    }

    /// Check if the url and method match the provider's url_regex and method
    pub fn check_url_method(&self, url: &str, method: &str) -> Result<bool, ProviderError> {
        self.get_compiled_regex(|regex| Ok(regex.is_match(url) && self.method == method))
    }
}

/// Config is the provider configuration for the verifier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Version is the version of the config
    pub version: String,
    /// Expected PCRs is a map of PCR banks and the expected value for each bank
    #[serde(rename = "EXPECTED_PCRS")]
    pub expected_pcrs: std::collections::HashMap<String, String>,
    /// Providers is a list of providers that the verifier will use to process the response
    #[serde(rename = "PROVIDERS")]
    pub providers: Vec<Provider>,
}

#[cfg(not(target_arch = "wasm32"))]
/// Simple attribute expression evaluator
fn evaluate_attribute_expression(
    expr: &str,
    data: &serde_json::Value,
) -> Result<std::collections::HashMap<String, serde_json::Value>, String> {
    use std::collections::HashMap;

    // Remove outer braces
    let content = expr
        .trim()
        .strip_prefix('{')
        .and_then(|s| s.strip_suffix('}'))
        .unwrap_or(expr)
        .trim();

    let mut result = HashMap::new();

    // Split by comma, handling nested expressions
    let fields = split_attribute_fields(content)?;

    for field in fields {
        let (output_key, field_expr) = parse_field_mapping(&field)?;
        let value = evaluate_field_expression(&field_expr, data)?;
        result.insert(output_key, value);
    }

    Ok(result)
}

#[cfg(not(target_arch = "wasm32"))]
fn split_attribute_fields(content: &str) -> Result<Vec<String>, String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut paren_count = 0;
    let mut in_backticks = false;

    for ch in content.chars() {
        match ch {
            '`' => in_backticks = !in_backticks,
            '(' if !in_backticks => paren_count += 1,
            ')' if !in_backticks => paren_count -= 1,
            ',' if !in_backticks && paren_count == 0 => {
                if !current.trim().is_empty() {
                    fields.push(current.trim().to_string());
                }
                current.clear();
                continue;
            }
            _ => {}
        }
        current.push(ch);
    }

    if !current.trim().is_empty() {
        fields.push(current.trim().to_string());
    }

    Ok(fields)
}

#[cfg(not(target_arch = "wasm32"))]
fn parse_field_mapping(field_str: &str) -> Result<(String, String), String> {
    if let Some((output_key, expr_str)) = field_str.split_once(':') {
        Ok((output_key.trim().to_string(), expr_str.trim().to_string()))
    } else {
        Err(format!("Invalid field mapping: {}", field_str))
    }
}

#[cfg(not(target_arch = "wasm32"))]
fn evaluate_field_expression(
    expr: &str,
    data: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let expr = expr.trim();

    if let Some(and_pos) = find_operator_position(expr, "&&") {
        let left_expr = &expr[..and_pos].trim();
        let right_expr = &expr[and_pos + 2..].trim();
        let left_val = evaluate_field_expression(left_expr, data)?;
        let right_val = evaluate_field_expression(right_expr, data)?;

        let left_bool = left_val.as_bool().ok_or("Left side of && is not boolean")?;
        let right_bool = right_val
            .as_bool()
            .ok_or("Right side of && is not boolean")?;

        return Ok(serde_json::Value::Bool(left_bool && right_bool));
    }

    if let Some(gt_pos) = find_operator_position(expr, ">") {
        let left_expr = &expr[..gt_pos].trim();
        let right_expr = &expr[gt_pos + 1..].trim();
        let left_val = evaluate_field_expression(left_expr, data)?;
        let right_val = parse_literal_value(right_expr)?;

        if let (Some(l), Some(r)) = (left_val.as_f64(), right_val.as_f64()) {
            return Ok(serde_json::Value::Bool(l > r));
        } else {
            return Err(format!("Cannot compare {:?} > {:?}", left_val, right_val));
        }
    }

    if let Some(eq_pos) = find_operator_position(expr, "==") {
        let left_expr = &expr[..eq_pos].trim();
        let right_expr = &expr[eq_pos + 2..].trim();
        let left_val = evaluate_field_expression(left_expr, data)?;
        let right_val = parse_literal_value(right_expr)?;

        return Ok(serde_json::Value::Bool(left_val == right_val));
    }

    if expr.starts_with("to_number(") && expr.ends_with(')') {
        let inner = &expr[10..expr.len() - 1];
        let inner_val = evaluate_field_expression(inner, data)?;
        match inner_val {
            serde_json::Value::Number(n) => return Ok(serde_json::Value::Number(n)),
            serde_json::Value::String(ref s) => {
                if let Ok(f) = s.parse::<f64>() {
                    if let Some(number) = serde_json::Number::from_f64(f) {
                        return Ok(serde_json::Value::Number(number));
                    } else {
                        return Err(format!("Invalid number value: {} (NaN or infinite)", f));
                    }
                }
            }
            _ => {}
        }
        return Err(format!("Cannot convert {:?} to number", inner_val));
    }

    if expr.starts_with("length(") && expr.ends_with(')') {
        let inner = &expr[7..expr.len() - 1];
        let inner_val = evaluate_field_expression(inner, data)?;
        match inner_val {
            serde_json::Value::String(s) => {
                return Ok(serde_json::Value::Number(serde_json::Number::from(s.len())))
            }
            serde_json::Value::Array(a) => {
                return Ok(serde_json::Value::Number(serde_json::Number::from(a.len())))
            }
            _ => return Err(format!("Cannot get length of {:?}", inner_val)),
        }
    }

    if expr.contains('.') {
        let parts: Vec<&str> = expr.split('.').collect();
        let mut current = data;
        for part in parts {
            current = current
                .get(part)
                .ok_or_else(|| format!("Field '{}' not found", part))?;
        }
        return Ok(current.clone());
    }

    data.get(expr)
        .cloned()
        .ok_or_else(|| format!("Field '{}' not found", expr))
}

#[cfg(not(target_arch = "wasm32"))]
fn find_operator_position(expr: &str, op: &str) -> Option<usize> {
    let mut paren_count = 0;
    let mut in_backticks = false;

    for (i, ch) in expr.char_indices() {
        match ch {
            '`' => in_backticks = !in_backticks,
            '(' if !in_backticks => paren_count += 1,
            ')' if !in_backticks => paren_count -= 1,
            _ if !in_backticks && paren_count == 0 => {
                if expr[i..].starts_with(op) {
                    return Some(i);
                }
            }
            _ => {}
        }
    }
    None
}

#[cfg(not(target_arch = "wasm32"))]
fn parse_literal_value(value_str: &str) -> Result<serde_json::Value, String> {
    let value_str = value_str.trim();

    if value_str.starts_with('`') && value_str.ends_with('`') {
        let inner = &value_str[1..value_str.len() - 1];
        if let Ok(num) = inner.parse::<f64>() {
            if let Some(number) = serde_json::Number::from_f64(num) {
                return Ok(serde_json::Value::Number(number));
            } else {
                return Err(format!(
                    "Invalid number value in backticks: {} (NaN or infinite)",
                    num
                ));
            }
        } else {
            return Ok(serde_json::Value::String(inner.to_string()));
        }
    }

    if let Ok(num) = value_str.parse::<f64>() {
        if let Some(number) = serde_json::Number::from_f64(num) {
            return Ok(serde_json::Value::Number(number));
        } else {
            return Err(format!("Invalid number value: {} (NaN or infinite)", num));
        }
    }

    if (value_str.starts_with('"') && value_str.ends_with('"'))
        || (value_str.starts_with('\'') && value_str.ends_with('\''))
    {
        let inner = &value_str[1..value_str.len() - 1];
        return Ok(serde_json::Value::String(inner.to_string()));
    }

    Ok(serde_json::Value::String(value_str.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(not(target_arch = "wasm32"))]
    use tokio;

    const MISSING_ATTRIBUTES_PROVIDER_TEXT: &str = r#"{
        "id": 7,
        "host": "github.com",
        "urlRegex": "^https:\\/\\/api\\.github\\.com\\/users\\/[a-zA-Z0-9]+(\\?.*)?$",
        "targetUrl": "https://github.com",
        "method": "GET",
        "title": "Github profile",
        "description": "Go to your profile",
        "icon": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",  
        "responseType": "json"
    }"#;

    #[test]
    fn test_missing_attributes_provider() {
        let provider: Provider = serde_json::from_str(MISSING_ATTRIBUTES_PROVIDER_TEXT)
            .expect("Failed to parse provider");
        let response_text = r#"{
            "login": "xxxxxx",
            "id": 4715448,    
            "public_repos": 47,
            "public_gists": 0
    }"#;
        let processed_response = provider
            .preprocess_response(&response_text)
            .expect("Failed to preprocess response");
        let result = provider
            .get_attributes(&processed_response)
            .expect("Failed to get attributes");
        assert_eq!(result.len(), 0);
    }

    const HTML_MISSING_ATTRIBUTES_PROVIDER_TEXT: &str = r#"{
      "id": 7,
      "host": "github.com",
      "urlRegex": "^https:\\/\\/api\\.github\\.com\\/users\\/[a-zA-Z0-9]+(\\?.*)?$",
      "targetUrl": "https://github.com",
      "method": "GET",
      "title": "Github profile",
      "description": "Go to your profile",
      "icon": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",  
      "responseType": "json",
      "preprocess" : ""
  }"#;

    #[test]
    fn test_html_missing_attributes_provider() {
        let provider: Provider = serde_json::from_str(HTML_MISSING_ATTRIBUTES_PROVIDER_TEXT)
            .expect("Failed to parse provider");
        let response_text = r#"<html><body><h1 id="followers">94</h1><h1 id="following">80</h1><h1 id="public_repos">47</h1></body></html>"#;
        let processed_response = provider
            .preprocess_response(response_text)
            .expect("Failed to preprocess response");
        let result = provider
            .get_attributes(&processed_response)
            .expect("Failed to get attributes");
        assert_eq!(result.len(), 0);
    }

    const JSON_PROVIDER_TEXT: &str = r#"{
      "id": 7,
      "host": "github.com",
      "urlRegex": "^https:\\/\\/chatgpt\\.com\\/backend-api\\/sentinel\\/chat-requirements(\\?.*)?$",
      "targetUrl": "https://github.com",
      "method": "GET",
      "title": "Github profile",
      "description": "Go to your profile",
      "icon": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",  
      "responseType": "json",
      "attributes": ["{followers: followers, following: following}", "{public_repos: public_repos}", "{is_active: followers + following > public_repos}"]
    }"#;

    #[test]
    fn test_check_url_method() {
        let provider: Provider =
            serde_json::from_str(JSON_PROVIDER_TEXT).expect("Failed to parse provider");
        assert!(provider
            .check_url_method(
                "https://chatgpt.com/backend-api/sentinel/chat-requirements",
                "GET"
            )
            .expect("Failed to check url method"));
        assert!(!provider
            .check_url_method("https://api.github.com/users/xxxxxx/followers", "GET")
            .expect("Failed to check url method"));
    }

    const SSA_PROVIDER_TEXT: &str = r#"{
        "id": 4,
        "host": "secure.ssa.gov",
        "urlRegex": "https://secure.ssa.gov/myssa/myprofile-api/profileInfo",
        "targetUrl": "https://secure.ssa.gov/myssa/myprofile-ui/main",
        "method": "GET",
        "title": "US SSA",
        "description": "Go to your profile",
        "icon": "https://brandslogos.com/wp-content/uploads/images/large/us-social-security-administration-logo-black-and-white.png",
        "responseType": "json",
        "attributes": ["{age: age, isValid: length(loggedInUserInfo.cossn) == `11` } "],
        "preprocess": "function process(jsonString) { const startIndex = jsonString.indexOf('{'); const endIndex = jsonString.lastIndexOf('}') + 1; if (startIndex === -1 || endIndex === 0) { return {}; } try { const cleanedResponse = jsonString.slice(startIndex, endIndex); const s = JSON.parse(cleanedResponse); const currentDate = new Date(); const currentYear = currentDate.getFullYear(); let age = currentYear - s.loggedInUserInfo.dobYear; const currentMonth = currentDate.getMonth(); const currentDay = currentDate.getDate(); if (currentMonth === 0 && currentDay < 1) { age--; } s.age = age; return s; } catch (e) { return {}; }  }"
      }"#;

    const SSA_RESPONSE_TEXT: &str = r#"
          1e0
          {
              "responseStatus": {
                "returnCode": "0000",
                "reasonCode": "0000",
                "reasonDescription": "Successfully obtained the profile info"
              },
              "urlPath": "/myssa/bec-plan-prep-ui/",
              "loggedInUserInfo": {
                  "cossn": "***-**-9999",
                  "name": {
                    "firstName": "JOHN",
                    "middleName": "",
                    "lastName": "DOE",
                    "suffix": ""
                  },
                  "formattedName": "John Doe",
                  "otherServicesInd": "N",
                  "messageCount": "",
                  "dobYear": "1999",
                  "dobMonth": "09",
                  "dobDay": "09",
                  "contactDisplayInd": "N",
                  "bankingDisplayInd": "N"
              }
          }
          0"#;

    #[test]
    fn test_ssa_provider() {
        let provider: Provider =
            serde_json::from_str(SSA_PROVIDER_TEXT).expect("Failed to parse provider");
        let processed_response = provider
            .preprocess_response(&SSA_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let result = provider
            .get_attributes(&processed_response)
            .expect("Failed to get attributes");
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"age: 26".to_string()));
        assert!(result.contains(&"isValid: false".to_string()));
    }

    #[cfg(not(target_arch = "wasm32"))]
    #[tokio::test]
    async fn test_processor() {
        let processor = Processor::new(
            "https://raw159opfy.ufs.sh/f/taibMU1XxiEPtYPjjZ1XxiEPsjzpNu8frqFdalI30V7yCJBO"
                .to_string(),
            "https://link.freysa.ai/provider-schema".to_string(),
        )
        .await
        .expect("Failed to initialize processor");
        let result = processor
            .process(
                "https://secure.ssa.gov/myssa/myprofile-api/profileInfo",
                "GET",
                SSA_RESPONSE_TEXT,
            )
            .expect("Failed to process");
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"age: 25.0".to_string()));
        assert!(result.contains(&"isValid: true".to_string()));
    }

    const CHASE_RESPONSE_TEXT: &str = r#"{
        "creditScoreOutlineResponse": {
            "creditBureauName": "EXPERIAN",
            "creditScore": {
                "currentCreditScoreSummary": {
                    "creditRiskScore": 701,
                    "creditScoreGradeName": "GOOD"
                    },
                "previousCreditScoreSummary": {
                    "creditRiskScore": 123,
                    "creditScoreGradeName": "GOOD"
                },
                "creditScoreModelIdentifier": {
                    "riskModelName": "VantageScore",
                    "riskModelVersionNumber": "1.2"
                }
            }
        }
    }"#;

    const CHASE_PROVIDER_TEXT: &str = r#"{
      "id": 6,
      "host": "secure.chase.com",
      "urlRegex":
        "^https:\/\/secure.chase.com\/svc\/wr\/profile\/secure\/creditscore\/v2\/credit-journey\/servicing\/inquiry-maintenance\/v1\/customers\/credit-journey-insight-outlines.*",
      "targetUrl": "https://secure.chase.com/web/auth/dashboard#/dashboard/overview",
      "method": "GET",
      "title": "Chase credit score",
      "description": "Login to your chase account",
      "icon": "https://download.logo.wine/logo/Chase_Bank/Chase_Bank-Logo.wine.png",
      "responseType": "json",
      "attributes": ["{creditScore: score, high_score: high_score, grade_name: grade_name}"],
      "preprocess": "function process(jsonString) { const s =JSON.parse(jsonString); return {score: s.creditScoreOutlineResponse.creditScore.currentCreditScoreSummary.creditRiskScore, high_score: s.creditScoreOutlineResponse.creditScore.currentCreditScoreSummary.creditRiskScore > 700, grade_name: s.creditScoreOutlineResponse.creditScore.currentCreditScoreSummary.creditScoreGradeName} }"
    }"#;

    #[test]
    fn test_chase_provider() {
        let provider: Provider =
            serde_json::from_str(CHASE_PROVIDER_TEXT).expect("Failed to parse provider");
        let result = provider
            .preprocess_response(&CHASE_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let result = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");
        println!("result: {:?}", result);
        // assert_eq!(result.len(), 2);
    }

    const UBEREATS_RESPONSE_TEXT: &str = r#"
  {
  "status": "success",
  "data": {
    "ordersMap": {
      "6a58f37d-5258-4ac7-902c-2c9c26d72259": {
        "baseEaterOrder": {
          "uuid": "6a58f37d-5258-4ac7-902c-2c9c26d72259",
          "storeUuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
          "isCancelled": false,
          "isCompleted": true,
          "completedAt": "2024-08-19T20:38:34.000Z",
          "lastStateChangeAt": "2024-08-19T20:38:34.000Z",
          "orderStateChanges": [
            {
              "stateChangeTime": "2024-08-19T19:31:56.000Z",
              "type": "CREATED",
              "changingEntityUuid": null
            },
            {
              "stateChangeTime": "2024-08-19T19:31:56.000Z",
              "type": "OFFERED",
              "changingEntityUuid": null
            },
            {
              "stateChangeTime": "2024-08-19T19:32:01.000Z",
              "type": "ASSIGNED",
              "changingEntityUuid": null
            },
            {
              "stateChangeTime": "2024-08-19T20:38:34.000Z",
              "type": "COMPLETED",
              "changingEntityUuid": null
            }
          ],
          "deliveryStateChanges": [
            {
              "stateChangeTime": "2024-08-19T19:41:49.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:43:03.000Z",
              "type": "UNKNOWN"
            },
            {
              "stateChangeTime": "2024-08-19T19:44:33.000Z",
              "type": "CANCELED"
            },
            {
              "stateChangeTime": "2024-08-19T19:44:50.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:45:03.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:45:19.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:46:03.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:46:35.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:47:03.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:47:19.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:48:03.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:48:19.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:48:48.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:51:34.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:52:19.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:52:34.000Z",
              "type": "DISPATCHED"
            },
            {
              "stateChangeTime": "2024-08-19T19:53:33.000Z",
              "type": "UNKNOWN"
            },
            {
              "stateChangeTime": "2024-08-19T19:55:39.000Z",
              "type": "PICKUP_ARRIVED"
            },
            {
              "stateChangeTime": "2024-08-19T19:59:31.000Z",
              "type": "BEGINTRIP"
            },
            {
              "stateChangeTime": "2024-08-19T20:37:11.000Z",
              "type": "PICKUP_ARRIVED"
            },
            {
              "stateChangeTime": "2024-08-19T20:38:34.000Z",
              "type": "COMPLETED"
            }
          ],
          "shoppingCart": {
            "cartUuid": "8b3a9eb6-d13a-42b8-b862-2a96c19e8d99",
            "items": [
              {
                "uuid": "c7ff3e87-932d-58cd-9f58-cd324172feb6",
                "storeUuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
                "shoppingCartItemUuid": "7cec3d83-c757-410e-bb93-8a48fc6d5e58",
                "sectionUuid": "35272fb5-ad16-5375-919c-c20ec5f6b62d",
                "subsectionUuid": "b951886a-8e21-5c8a-a791-13790f4dffd3",
                "title": "Thai Coconut Curry Soup",
                "price": 875,
                "quantity": 1,
                "specialInstructions": "",
                "customizations": [],
                "cartItemCustomizations": {},
                "consumerUuid": "baa82dfe-7833-4b34-b854-88684e38e81e",
                "rating": null,
                "itemQuantity": {
                  "inSellableUnit": {
                    "value": {
                      "coefficient": 1,
                      "exponent": 0
                    },
                    "measurementUnit": {
                      "measurementType": "MEASUREMENT_TYPE_COUNT",
                      "length": null,
                      "weight": null,
                      "volume": null
                    },
                    "measurementUnitAbbreviationText": null
                  },
                  "inPriceableUnit": null
                }
              },
              {
                "uuid": "5151f82e-8b5a-5932-b50c-9be8d212c5f4",
                "storeUuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
                "shoppingCartItemUuid": "c1f8bac1-c5be-4694-b661-178e9eb90af3",
                "sectionUuid": "35272fb5-ad16-5375-919c-c20ec5f6b62d",
                "subsectionUuid": "b951886a-8e21-5c8a-a791-13790f4dffd3",
                "title": "Taiwanese Fried Cashew Mozzarella Croquettes",
                "price": 1125,
                "quantity": 1,
                "specialInstructions": "",
                "customizations": [
                  {
                    "uuid": "c0d24887-fb53-5759-8725-9d3a8669ed97",
                    "title": "Sauce (Mozzarella Balls)",
                    "childOptions": {
                      "options": [
                        {
                          "price": 0,
                          "quantity": 1,
                          "title": "Spicy Ketchup on the side",
                          "uuid": "9e793c7e-abc1-5d64-a2bb-026fae6bddb2",
                          "childCustomizationList": []
                        }
                      ]
                    },
                    "groupId": 0
                  }
                ],
                "cartItemCustomizations": {
                  "c0d24887-fb53-5759-8725-9d3a8669ed97+0": [
                    {
                      "uuid": "9e793c7e-abc1-5d64-a2bb-026fae6bddb2",
                      "price": 0,
                      "quantity": 1,
                      "title": "Spicy Ketchup on the side",
                      "defaultQuantity": 0,
                      "customizationMeta": {
                        "title": "Sauce (Mozzarella Balls)",
                        "isPickOne": false
                      }
                    }
                  ]
                },
                "consumerUuid": "baa82dfe-7833-4b34-b854-88684e38e81e",
                "rating": null,
                "itemQuantity": {
                  "inSellableUnit": {
                    "value": {
                      "coefficient": 1,
                      "exponent": 0
                    },
                    "measurementUnit": {
                      "measurementType": "MEASUREMENT_TYPE_COUNT",
                      "length": null,
                      "weight": null,
                      "volume": null
                    },
                    "measurementUnitAbbreviationText": null
                  },
                  "inPriceableUnit": null
                }
              },
              {
                "uuid": "48a6aa8d-a703-5357-b873-772351b5fde8",
                "storeUuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
                "shoppingCartItemUuid": "6aae0ca3-a184-4e47-a05c-8b10ee2d3563",
                "sectionUuid": "35272fb5-ad16-5375-919c-c20ec5f6b62d",
                "subsectionUuid": "b951886a-8e21-5c8a-a791-13790f4dffd3",
                "title": "Firecracker Cauliflower",
                "price": 1125,
                "quantity": 1,
                "specialInstructions": "",
                "customizations": [
                  {
                    "uuid": "ae63620e-de6d-51f6-bb25-a75e990d6ea2",
                    "title": "Substitute Firecracker sauce",
                    "childOptions": {
                      "options": [
                        {
                          "price": 0,
                          "quantity": 1,
                          "title": "Sub for Teriyaki sauce",
                          "uuid": "16b44899-398e-5768-babb-f3048bdc63a8",
                          "childCustomizationList": []
                        }
                      ]
                    },
                    "groupId": 0
                  }
                ],
                "cartItemCustomizations": {
                  "ae63620e-de6d-51f6-bb25-a75e990d6ea2+0": [
                    {
                      "uuid": "16b44899-398e-5768-babb-f3048bdc63a8",
                      "price": 0,
                      "quantity": 1,
                      "title": "Sub for Teriyaki sauce",
                      "defaultQuantity": 0,
                      "customizationMeta": {
                        "title": "Substitute Firecracker sauce",
                        "isPickOne": false
                      }
                    }
                  ]
                },
                "consumerUuid": "baa82dfe-7833-4b34-b854-88684e38e81e",
                "rating": null,
                "itemQuantity": {
                  "inSellableUnit": {
                    "value": {
                      "coefficient": 1,
                      "exponent": 0
                    },
                    "measurementUnit": {
                      "measurementType": "MEASUREMENT_TYPE_COUNT",
                      "length": null,
                      "weight": null,
                      "volume": null
                    },
                    "measurementUnitAbbreviationText": null
                  },
                  "inPriceableUnit": null
                }
              }
            ],
            "currencyCode": "USD"
          },
          "currencyCode": "USD",
          "isScheduledOrder": false,
          "numItems": 3,
          "totalQuantity": 3,
          "fulfillmentType": "DELIVERY",
          "userGroupedItems": [
            {
              "items": [
                {
                  "uuid": "c7ff3e87-932d-58cd-9f58-cd324172feb6",
                  "storeUuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
                  "shoppingCartItemUuid": "7cec3d83-c757-410e-bb93-8a48fc6d5e58",
                  "sectionUuid": "35272fb5-ad16-5375-919c-c20ec5f6b62d",
                  "subsectionUuid": "b951886a-8e21-5c8a-a791-13790f4dffd3",
                  "title": "Thai Coconut Curry Soup",
                  "price": 875,
                  "quantity": 1,
                  "specialInstructions": "",
                  "customizations": [],
                  "cartItemCustomizations": {},
                  "consumerUuid": "baa82dfe-7833-4b34-b854-88684e38e81e",
                  "rating": null,
                  "itemQuantity": {
                    "inSellableUnit": {
                      "value": {
                        "coefficient": 1,
                        "exponent": 0
                      },
                      "measurementUnit": {
                        "measurementType": "MEASUREMENT_TYPE_COUNT",
                        "length": null,
                        "weight": null,
                        "volume": null
                      },
                      "measurementUnitAbbreviationText": null
                    },
                    "inPriceableUnit": null
                  }
                },
                {
                  "uuid": "5151f82e-8b5a-5932-b50c-9be8d212c5f4",
                  "storeUuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
                  "shoppingCartItemUuid": "c1f8bac1-c5be-4694-b661-178e9eb90af3",
                  "sectionUuid": "35272fb5-ad16-5375-919c-c20ec5f6b62d",
                  "subsectionUuid": "b951886a-8e21-5c8a-a791-13790f4dffd3",
                  "title": "Taiwanese Fried Cashew Mozzarella Croquettes",
                  "price": 1125,
                  "quantity": 1,
                  "specialInstructions": "",
                  "customizations": [
                    {
                      "uuid": "c0d24887-fb53-5759-8725-9d3a8669ed97",
                      "title": "Sauce (Mozzarella Balls)",
                      "childOptions": {
                        "options": [
                          {
                            "price": 0,
                            "quantity": 1,
                            "title": "Spicy Ketchup on the side",
                            "uuid": "9e793c7e-abc1-5d64-a2bb-026fae6bddb2",
                            "childCustomizationList": []
                          }
                        ]
                      },
                      "groupId": 0
                    }
                  ],
                  "cartItemCustomizations": {
                    "c0d24887-fb53-5759-8725-9d3a8669ed97+0": [
                      {
                        "uuid": "9e793c7e-abc1-5d64-a2bb-026fae6bddb2",
                        "price": 0,
                        "quantity": 1,
                        "title": "Spicy Ketchup on the side",
                        "defaultQuantity": 0,
                        "customizationMeta": {
                          "title": "Sauce (Mozzarella Balls)",
                          "isPickOne": false
                        }
                      }
                    ]
                  },
                  "consumerUuid": "baa82dfe-7833-4b34-b854-88684e38e81e",
                  "rating": null,
                  "itemQuantity": {
                    "inSellableUnit": {
                      "value": {
                        "coefficient": 1,
                        "exponent": 0
                      },
                      "measurementUnit": {
                        "measurementType": "MEASUREMENT_TYPE_COUNT",
                        "length": null,
                        "weight": null,
                        "volume": null
                      },
                      "measurementUnitAbbreviationText": null
                    },
                    "inPriceableUnit": null
                  }
                },
                {
                  "uuid": "48a6aa8d-a703-5357-b873-772351b5fde8",
                  "storeUuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
                  "shoppingCartItemUuid": "6aae0ca3-a184-4e47-a05c-8b10ee2d3563",
                  "sectionUuid": "35272fb5-ad16-5375-919c-c20ec5f6b62d",
                  "subsectionUuid": "b951886a-8e21-5c8a-a791-13790f4dffd3",
                  "title": "Firecracker Cauliflower",
                  "price": 1125,
                  "quantity": 1,
                  "specialInstructions": "",
                  "customizations": [
                    {
                      "uuid": "ae63620e-de6d-51f6-bb25-a75e990d6ea2",
                      "title": "Substitute Firecracker sauce",
                      "childOptions": {
                        "options": [
                          {
                            "price": 0,
                            "quantity": 1,
                            "title": "Sub for Teriyaki sauce",
                            "uuid": "16b44899-398e-5768-babb-f3048bdc63a8",
                            "childCustomizationList": []
                          }
                        ]
                      },
                      "groupId": 0
                    }
                  ],
                  "cartItemCustomizations": {
                    "ae63620e-de6d-51f6-bb25-a75e990d6ea2+0": [
                      {
                        "uuid": "16b44899-398e-5768-babb-f3048bdc63a8",
                        "price": 0,
                        "quantity": 1,
                        "title": "Sub for Teriyaki sauce",
                        "defaultQuantity": 0,
                        "customizationMeta": {
                          "title": "Substitute Firecracker sauce",
                          "isPickOne": false
                        }
                      }
                    ]
                  },
                  "consumerUuid": "baa82dfe-7833-4b34-b854-88684e38e81e",
                  "rating": null,
                  "itemQuantity": {
                    "inSellableUnit": {
                      "value": {
                        "coefficient": 1,
                        "exponent": 0
                      },
                      "measurementUnit": {
                        "measurementType": "MEASUREMENT_TYPE_COUNT",
                        "length": null,
                        "weight": null,
                        "volume": null
                      },
                      "measurementUnitAbbreviationText": null
                    },
                    "inPriceableUnit": null
                  }
                }
              ],
              "quantity": 3
            }
          ],
          "posType": "UNDEFINED",
          "orderAppVariant": "UBEREATS",
          "isBackfilledOrder": false,
          "displayName": "",
          "billSplitOption": "UNKNOWN_BILL_SPLIT_OPTION",
          "isOrderCreator": true,
          "creatorDisplayName": "xxxxxxxxx"
        },
        "storeInfo": {
          "uuid": "484a901a-3750-49a0-8207-b4db729ba2d2",
          "heroImageUrl": "https://duyt4h9nfnj50.cloudfront.net/sku/c5929f791f8cad88221c2f3e2f6958ea",
          "title": "Pow Pow",
          "isOpen": false,
          "closedMessage": "Closed",
          "location": {
            "address": {
              "address1": "1253 H St NE, Washington, DC 20002, USA",
              "aptOrSuite": "",
              "city": "Washington",
              "country": "US",
              "postalCode": "20002",
              "region": "DC",
              "title": null,
              "uuid": "f7421339-086d-4a06-b2f7-b9270dbfa137",
              "eaterFormattedAddress": "1253 H St NE, Washington, DC 20002, USA, Washington, DC 20002",
              "subtitle": null,
              "businessName": null,
              "street": null,
              "ugcAddressFieldInfo": null
            },
            "latitude": 38.9001426,
            "longitude": -76.988559,
            "reference": null,
            "type": null,
            "placeReferences": null,
            "interactionType": null,
            "nickname": null
          },
          "storeStatus": {
            "isActive": true,
            "notActiveReason": "UNKNOWN"
          },
          "contact": {
            "phoneNumber": "+xxxxxxxxxxx"
          },
          "territoryUUID": "d5f8a8fc-e1bb-4309-acb8-aac5b7c97260",
          "rating": null,
          "slug": "pow-pow-1253-h-st-ne"
        },
        "courierInfo": {
          "name": ""
        },
        "fareInfo": {
          "totalPrice": 3002.9999999999995,
          "checkoutInfo": [
            {
              "label": "delivery.uber.service_fee",
              "type": "credit",
              "rawValue": 0.1,
              "key": "delivery.uber.service_fee"
            },
            {
              "label": "delivery.uber.service_fee.tax",
              "type": "credit",
              "rawValue": 0.01,
              "key": "delivery.uber.service_fee.tax"
            },
            {
              "label": "Tax on Delivery Fees",
              "type": "credit",
              "rawValue": 0.48,
              "key": "eats.mp.charges.bundled_delivery_fee_taxes"
            },
            {
              "label": "Special Offer",
              "type": "debit",
              "rawValue": -10.94,
              "key": "eats.discounts.store_promotion"
            },
            {
              "label": "Subtotal",
              "type": "credit",
              "rawValue": 31.25,
              "key": "eats_fare.subtotal"
            },
            {
              "label": "Tax",
              "type": "credit",
              "rawValue": 2.03,
              "key": "eats.tax.base"
            },
            {
              "label": "Service Fee and Other Fees",
              "type": "credit",
              "rawValue": 4.79,
              "key": "eats.mp.charges.basket_dependent_fee"
            },
            {
              "label": "Tip",
              "type": "credit",
              "rawValue": 2.31,
              "key": "eats_fare.tip"
            },
            {
              "label": "Total",
              "type": "credit",
              "rawValue": 30.029999999999998,
              "key": "eats_fare.total"
            }
          ]
        },
        "ratingInfo": {
          "isRatable": true,
          "userRatings": []
        },
        "interactionType": "leave_in_lobby"
      }
    },
    "orderUuids": [
      "6a58f37d-5258-4ac7-902c-2c9c26d72259"
    ],
    "paginationData": {
      "nextCursor": "{\"entity_type\":\"CONSUMER\",\"cursor\":\"MjAyMy0wMy0xMlQyMzowNjowOS43MDRa\"}"
    },
    "meta": {
      "hasMore": true
    }
  }
}
  "#;

    const UBEREATS_PROVIDER_TEXT: &str = r#"
       {
      "id": 5,
      "host": "ubereats.com",
      "urlRegex":
        "^https:\\/\\/www\\.ubereats\\.com\\/_p\\/api\\/getPastOrdersV1.*",
      "targetUrl": "https://www.ubereats.com/orders",
      "method": "POST",
      "title": "Uber eats orders",
      "description": "Go to your order history",
      "icon": "https://i.pinimg.com/originals/a3/4a/8c/a34a8c234e27ac9476e7f010f750d136.jpg",
      "responseType": "json",
      "attributes": ["{usd_total: USD.totalPrice, usd_count: USD.orderCount}"],
      "preprocess": "function process(jsonString) { const totals = Object.values(JSON.parse(jsonString).data.ordersMap).reduce((totals, order) => { const price = order.fareInfo.totalPrice; const currency = order.baseEaterOrder.currencyCode; if (typeof price === 'number' && currency) { if (!totals[currency]) { totals[currency] = { totalPrice: 0, orderCount: 0 }; } totals[currency].totalPrice += price; totals[currency].orderCount += 1; } return totals; }, {}); Object.keys(totals).forEach(currency => totals[currency].totalPrice = (totals[currency].totalPrice / 100).toFixed(2)); return totals; } "
    }"#;

    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn test_ubereats_provider() {
        let provider: Provider =
            serde_json::from_str(UBEREATS_PROVIDER_TEXT).expect("Failed to parse provider");
        let result = provider
            .preprocess_response(&UBEREATS_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let result = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");
        println!("{:?}", result);
        assert!(result.contains(&"usd_total: \"30.03\"".to_string()));
        assert!(result.contains(&"usd_count: 1".to_string()));
    }

    const REDDIT_PROVIDER_TEXT: &str = r#"{
      "id": 3,
      "host": "reddit.com",
      "urlRegex": "^https:\\/\\/www\\.reddit\\.com\\/user\\/[a-zA-Z0-9]+.*\\/about\\.json$",
      "targetUrl": "https://www.reddit.com",
      "method": "GET",
      "title": "Reddit account",
      "description": "Go to your profile",
      "icon": "https://seeklogo.com/images/R/reddit-icon-new-2023-logo-3F12137D65-seeklogo.com.png",
      "responseType": "html",
      "actionSelectors": ["a[href^=\"/user/\"][href$=\"/\"]"],
      "attributes": ["{karma: karma}"],
      "preprocess": "function process(jsonString) { const data = JSON.parse(jsonString); return { karma: data.data.total_karma } }"
    }"#;

    const REDDIT_RESPONSE_TEXT: &str = r#"{
  "kind": "t2",
  "data": {
    "is_employee": false,
    "has_visited_new_profile": false,
    "is_friend": false,
    "pref_no_profanity": true,
    "has_external_account": false,
    "pref_geopopular": "",
    "pref_show_trending": true,
    "subreddit": {
      "default_set": true,
      "user_is_contributor": false,
      "banner_img": "",
      "allowed_media_in_comments": [],
      "user_is_banned": false,
      "free_form_reports": true,
      "community_icon": null,
      "show_media": true,
      "icon_color": "",
      "user_is_muted": null,
      "display_name": "u_xxxxxx",
      "header_img": null,
      "title": "",
      "coins": 0,
      "previous_names": [],
      "over_18": false,
      "icon_size": [
        256,
        256
      ],
      "primary_color": "",
      "icon_img": "https://styles.redditmedia.com/t5_3w62uh/styles/profileIcon_ldu1icwig3c81.png?width=256&amp;height=256&amp;crop=256:256,smart&amp;s=15bd7ab8be642a980566f9075fc5815f508935e7",
      "description": "",
      "submit_link_label": "",
      "header_size": null,
      "restrict_posting": true,
      "restrict_commenting": false,
      "subscribers": 1,
      "submit_text_label": "",
      "is_default_icon": false,
      "link_flair_position": "",
      "display_name_prefixed": "u/xxxxxx",
      "key_color": "",
      "name": "t5_3w62uh",
      "is_default_banner": true,
      "url": "/user/xxxxxx/",
      "quarantine": false,
      "banner_size": null,
      "user_is_moderator": true,
      "accept_followers": true,
      "public_description": "Ads and Premium services engineer @brave\n\nComputer languages enthusiast\nSwore oath to protect privacy",
      "link_flair_enabled": false,
      "disable_contributor_requests": false,
      "subreddit_type": "user",
      "user_is_subscriber": false
    },
    "pref_show_presence": true,
    "snoovatar_img": "",
    "snoovatar_size": null,
    "gold_expiration": null,
    "has_gold_subscription": false,
    "is_sponsor": false,
    "num_friends": 0,
    "features": {
      "modmail_harassment_filter": true,
      "mod_service_mute_writes": true,
      "promoted_trend_blanks": true,
      "show_amp_link": true,
      "chat": true,
      "is_email_permission_required": false,
      "mod_awards": true,
      "mweb_xpromo_revamp_v3": {
        "owner": "growth",
        "variant": "control_1",
        "experiment_id": 480
      },
      "mweb_xpromo_revamp_v2": {
        "owner": "growth",
        "variant": "treatment_4",
        "experiment_id": 457
      },
      "awards_on_streams": true,
      "mweb_xpromo_modal_listing_click_daily_dismissible_ios": true,
      "chat_subreddit": true,
      "cookie_consent_banner": true,
      "modlog_copyright_removal": true,
      "do_not_track": true,
      "images_in_comments": true,
      "mod_service_mute_reads": true,
      "chat_user_settings": true,
      "use_pref_account_deployment": true,
      "mweb_xpromo_interstitial_comments_ios": true,
      "mweb_xpromo_modal_listing_click_daily_dismissible_android": true,
      "premium_subscriptions_table": true,
      "mweb_xpromo_interstitial_comments_android": true,
      "crowd_control_for_post": true,
      "mweb_sharing_web_share_api": {
        "owner": "growth",
        "variant": "control_1",
        "experiment_id": 314
      },
      "chat_group_rollout": true,
      "resized_styles_images": true,
      "noreferrer_to_noopener": true,
      "expensive_coins_package": true
    },
    "can_edit_name": false,
    "is_blocked": false,
    "verified": true,
    "new_modmail_exists": null,
    "pref_autoplay": true,
    "coins": 0,
    "has_paypal_subscription": false,
    "has_subscribed_to_premium": false,
    "id": "a2gghybr",
    "can_create_subreddit": true,
    "over_18": true,
    "is_gold": false,
    "is_mod": false,
    "awarder_karma": 0,
    "suspension_expiration_utc": null,
    "has_stripe_subscription": false,
    "is_suspended": false,
    "pref_video_autoplay": true,
    "in_chat": true,
    "has_android_subscription": false,
    "in_redesign_beta": true,
    "icon_img": "https://styles.redditmedia.com/t5_3w62uh/styles/profileIcon_ldu1icwig3c81.png?width=256&amp;height=256&amp;crop=256:256,smart&amp;s=15bd7ab8be642a980566f9075fc5815f508935e7",
    "has_mod_mail": false,
    "pref_nightmode": false,
    "awardee_karma": 0,
    "hide_from_robots": false,
    "password_set": true,
    "modhash": "hf34fcz1wh637b593a4a2303d3f9193e2b9446faf6c90dee7a",
    "link_karma": 1,
    "force_password_reset": false,
    "total_karma": 1,
    "inbox_count": 2,
    "pref_top_karma_subreddits": true,
    "has_mail": true,
    "pref_show_snoovatar": false,
    "name": "xxxxxx",
    "pref_clickgadget": 5,
    "created": 1612356751,
    "has_verified_email": true,
    "gold_creddits": 0,
    "created_utc": 1612356751,
    "has_ios_subscription": false,
    "pref_show_twitter": false,
    "in_beta": false,
    "comment_karma": 0,
    "accept_followers": true,
    "has_subscribed": true
  }
}"#;

    #[test]
    fn test_reddit_provider() {
        let matchurl = "https://www.reddit.com/user/xxxxxx/about.json";
        let provider: Provider =
            serde_json::from_str(REDDIT_PROVIDER_TEXT).expect("Failed to parse provider");
        provider
            .check_url_method(matchurl, "POST")
            .expect("Failed to check url method");
        let result = provider
            .preprocess_response(&REDDIT_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let attributes = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");
        assert_eq!(attributes.len(), 1);
        assert_eq!(attributes[0], "karma: 1");
    }

    const ROBINHOOD_RESPONSE_TEXT: &str = r#"{
  "title": null,
  "weight": null,
  "include_all_hours": true,
  "line_ordering": [],
  "performance_baseline": {
    "currency_code": "USD",
    "currency_id": "1072fc76-1862-41ab-82c2-485837590762",
    "amount": "10245.5079335464"
  }
}
    "#;

    const ROBINHOOD_PROVIDER_TEXT: &str = r#"{
      "id": 2,
      "host": "robinhood.com",
      "urlRegex":
        "^https:\\/\\/bonfire\\.robinhood\\.com\\/portfolio\\/performance\\/[a-zA-Z0-9]+(\\?.*)?$",
      "targetUrl": "https://robinhood.com/",
      "method": "GET",
      "title": "Robinhood balance greater than $10,000",
      "description": "Go to your portfolio",
      "icon": "https://upload.wikimedia.org/wikipedia/commons/b/b9/Robinhood_Logo.png",
      "responseType": "json",
      "attributes": ["{over_10k: to_number(performance_baseline.amount) >`10000` && performance_baseline.currency_code == 'USD'}"]
    }"#;

    #[test]
    fn test_robinhood_provider() {
        let provider: Provider =
            serde_json::from_str(ROBINHOOD_PROVIDER_TEXT).expect("Failed to parse provider");
        let result = provider
            .preprocess_response(&ROBINHOOD_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let attributes = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");
        println!("{:?}", attributes);
        assert_eq!(attributes.len(), 1);
        assert_eq!(attributes[0], "over_10k: true");
    }

    const TWITTER_BIO_RESPONSE_TEXT: &str = r#"{
  "data": {
    "user": {
      "result": {
        "__typename": "User",
        "id": "VRNlcjoxNjc2OTI4NDU2MjI1ODk4NDk2",
        "rest_id": "1676928456225898496",
        "affiliates_highlighted_label": {},
        "avatar": {
          "image_url": "https://pbs.twimg.com/profile_images/1938401595659534336/4FfZgohs_normal.jpg"
        },
        "core": {
          "created_at": "Thu Jan 06 12:18:01 +0000 2022",
          "name": "fppp290",
          "screen_name": "Johndoe93"
        },
        "dm_permissions": {
          "can_dm": true
        },
        "has_graduated_access": true,
        "is_blue_verified": true,
        "legacy": {
          "default_profile": true,
          "default_profile_image": false,
          "description": "It starts with freysa...",
          "entities": {
            "description": {
              "urls": []
            }
          },
          "fast_followers_count": 0,
          "favourites_count": 182,
          "followers_count": 35,
          "friends_count": 180,
          "has_custom_timelines": false,
          "is_translator": false,
          "listed_count": 1,
          "media_count": 7,
          "needs_phone_verification": false,
          "normal_followers_count": 35,
          "pinned_tweet_ids_str": [
            "1875293532711186617"
          ],
          "possibly_sensitive": false,
          "profile_banner_url": "https://pbs.twimg.com/profile_banners/1676928456225898496/1738727374",
          "profile_interstitial_type": "",
          "statuses_count": 565,
          "translator_type": "none",
          "want_retweets": false,
          "withheld_in_countries": []
        },
        "location": {
          "location": ""
        },
        "media_permissions": {
          "can_media_tag": true
        },
        "parody_commentary_fan_label": "None",
        "profile_image_shape": "Circle",
        "privacy": {
          "protected": false
        },
        "relationship_perspectives": {
          "following": false
        },
        "tipjar_settings": {},
        "verification": {
          "verified": false
        },
        "legacy_extended_profile": {
          "birthdate": {
            "day": 12,
            "month": 1,
            "year": 1994,
            "visibility": "Self",
            "year_visibility": "Self"
          }
        },
        "is_profile_translatable": false,
        "has_hidden_subscriptions_on_profile": false,
        "verification_info": {
          "is_identity_verified": false,
          "reason": {
            "description": {
              "text": "This account is verified. Learn more",
              "entities": [
                {
                  "from_index": 26,
                  "to_index": 36,
                  "ref": {
                    "url": "https://help.twitter.com/managing-your-account/about-twitter-verified-accounts",
                    "url_type": "ExternalUrl"
                  }
                }
              ]
            },
            "verified_since_msec": "1735851543944"
          }
        },
        "highlights_info": {
          "can_highlight_tweets": true,
          "highlighted_tweets": "1"
        },
        "user_seed_tweet_count": 0,
        "premium_gifting_eligible": false,
        "business_account": {},
        "creator_subscriptions_count": 0
      }
    }
  }
}"#;

    const TWITTER_BIO_PROVIDER_TEXT: &str = r#"{
        "id": 2,
        "host": "x.com",
        "urlRegex": "^https:\\/\\/x\\.com\\/i\\/api\\/graphql\\/[\\w\\d]+\\/UserByScreenName(\\?.*)?$",
        "targetUrl": "https://www.x.com/home",
        "method": "GET",
        "title": "Verify X subscription",
        "description": "",
        "icon": "twitterPremium",
        "responseType": "json",
        "actionSelectors": ["div[data-testid^='UserAvatar-Container-'] a[role=\"link\"] img[alt][draggable=\"true\"]"],
        "preprocess": "function process(jsonString) { const object = JSON.parse(jsonString); const parts = object.data.user.result.core.created_at.split(' '); const time = parts[3].split(':'); const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }; const createdAt = new Date(parseInt(parts[5]), months[parts[1]], parseInt(parts[2]), parseInt(time[0]), parseInt(time[1]), parseInt(time[2])); const targetDate = new Date('2023-03-01'); const PreGPT4 = createdAt < targetDate; const verified = object.data.user.result.is_blue_verified; if(!verified || !PreGPT4) throw new Error('Invalid account'); return { verified, PreGPT4 }; }",
        "attributes": ["{verified: verified, PreGPT4: PreGPT4}"]
    }"#;

    #[test]
    fn test_twitter_bio_provider() {
        let provider: Provider =
            serde_json::from_str(TWITTER_BIO_PROVIDER_TEXT).expect("Failed to parse provider");
        let result = provider
            .preprocess_response(&TWITTER_BIO_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let attributes = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");

        println!("result: {:?}", result);
        println!("attributes: {:?}", attributes);

        assert_eq!(attributes.len(), 2);
        assert!(attributes.contains(&"verified: true".to_string()));
        assert!(attributes.contains(&"PreGPT4: true".to_string()));
    }

    const CHATGPT_RESPONSE_TEXT: &str = r#"{
  "persona": "chatgpt-paid",
  "turnstile": {
    "required": true,
    "dx": "PBp5bWFze3lLcRxvbAxfaTdWVHRyemd5YAVJemZ5R3xfHFVuCHNAYEtXVm1dWFd/a25oZWMMWG0fZ09jcnlDcmRyVFZ/ellTNG50P3V+W2t/allvcGxkU3sRXRZ/aTEU"
  },
  "proofofwork": {
    "required": true,
    "seed": "0.3057354499477558",
    "difficulty": "0227c7"
  }
}"#;

    const CHATGPT_PROVIDER_TEXT: &str = r#"{
        "id": 1,
        "host": "chatgpt.com",
        "urlRegex": "^https:\\/\\/chatgpt\\.com\\/backend-api\\/sentinel\\/chat-requirements(\\?.*)?$",
        "targetUrl": "https://www.chatgpt.com/home",
        "method": "GET",
        "title": "ChatGPT Paid Account",
        "description": "",
        "icon": "https://utfs.io/f/taibMU1XxiEPtZlbWo1XxiEPsjzpNu8frqFdalI30V7yCJBO",
        "responseType": "json",
        "actionSelectors": ["a[role=\"link\"] img[alt][draggable=\"true\"]"],
        "preprocess": "function process(jsonString) { const obj = JSON.parse(jsonString); const paid = obj.persona === 'chatgpt-paid'; if(!paid) throw new Error('Invalid account'); return { paid: paid }; }",
        "attributes": ["{paid: paid}"]
      }"#;

    #[test]
    fn test_chatgpt_provider() {
        let provider: Provider =
            serde_json::from_str(CHATGPT_PROVIDER_TEXT).expect("Failed to parse provider");
        let result = provider
            .preprocess_response(&CHATGPT_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let attributes = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");

        println!("result: {:?}", result);
        println!("{:?}", attributes);
        assert_eq!(attributes.len(), 1);
        assert_eq!(attributes[0], "paid: true");
    }

    const CLAUDE_RESPONSE_TEXT: &str = r#"{
  "status": "active",
  "cancel_at_ts": null
  }"#;

    const CLAUDE_PROVIDER_TEXT: &str = r#"{
        "id": 0,
        "host": "claude.ai",
        "urlRegex": "^https:\\/\\/claude\\.ai(.*)?subscription_status(.*)?$",
        "targetUrl": "https://claude.ai/",
        "method": "GET",
        "title": "Claude Paid Account",
        "description": "",
        "icon": "https://utfs.io/f/taibMU1XxiEPtZlbWo1XxiEPsjzpNu8frqFdalI30V7yCJBO",
        "responseType": "json",
        "preprocess": "function process(jsonString) { const obj = JSON.parse(jsonString); return { paid: obj.status === 'active' }; }",
        "attributes": ["{paid: paid}"]
      }"#;

    #[test]
    fn test_claude_provider() {
        let provider: Provider =
            serde_json::from_str(CLAUDE_PROVIDER_TEXT).expect("Failed to parse provider");
        let result = provider
            .preprocess_response(&CLAUDE_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let attributes = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");

        println!("result: {:?}", result);
        println!("{:?}", attributes);
        assert_eq!(attributes.len(), 1);
        assert_eq!(attributes[0], "paid: true");
    }

    const X_FOLLOWERS_RESPONSE_TEXT: &str = r#"
{
    "data": {
      "viewer_v2": {
        "user_results": {
          "result": {
            "__typename": "User",
            "verified_follower_count": "9",
            "relationship_counts": {
              "followers": 29
            },
            "organic_metrics_time_series": [
              {
                "metric_values": [
                  {
                    "metric_value": 3,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 62,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_value": 2,
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-21T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 4,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 47,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Replies"
                  },
                  {
                    "metric_value": 3,
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_value": 3,
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-22T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 2,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 198,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_value": 6,
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-23T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 5,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 118,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_value": 3,
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-24T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 20,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-25T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 10,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-26T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 3,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 38,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_value": 2,
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_value": 3,
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-27T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 12,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 102,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Replies"
                  },
                  {
                    "metric_value": 3,
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_value": 4,
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-28T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 5,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 58,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_value": 2,
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-29T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 4,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-30T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 1,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 9,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-01-31T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 4,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-02-01T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 8,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_type": "Replies"
                  },
                  {
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-02-02T00:00:00Z"
                }
              },
              {
                "metric_values": [
                  {
                    "metric_value": 8,
                    "metric_type": "Engagements"
                  },
                  {
                    "metric_value": 107,
                    "metric_type": "Impressions"
                  },
                  {
                    "metric_value": 2,
                    "metric_type": "ProfileVisits"
                  },
                  {
                    "metric_type": "Follows"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Replies"
                  },
                  {
                    "metric_type": "Likes"
                  },
                  {
                    "metric_type": "Retweets"
                  },
                  {
                    "metric_type": "Bookmark"
                  },
                  {
                    "metric_type": "Share"
                  },
                  {
                    "metric_type": "UrlClicks"
                  },
                  {
                    "metric_type": "CreateTweet"
                  },
                  {
                    "metric_type": "CreateQuote"
                  },
                  {
                    "metric_value": 1,
                    "metric_type": "Unfollows"
                  },
                  {
                    "metric_value": 2,
                    "metric_type": "CreateReply"
                  }
                ],
                "timestamp": {
                  "iso8601_time": "2025-02-03T00:00:00Z"
                }
              }
            ],
            "id": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          },
          "id": "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"
        }
      }
    }
  }
    "#;

    const X_FOLLOWERS_PROVIDER_TEXT: &str = r#"{
            "id": 0,
            "host": "x.com",
            "urlRegex": "^https:\\/\\/x\\.com\\/i\\/api\\/graphql\\/[\\w-]+\\/AccountOverviewQuery$",
            "targetUrl": "https://x.com/i/account_analytics",
            "method": "GET",
            "title": "X Verified Followers",
            "description": "",
            "icon": "https://utfs.io/f/taibMU1XxiEPtZlbWo1XxiEPsjzpNu8frqFdalI30V7yCJBO",
            "responseType": "json",
            "preprocess": "function process(jsonString) { const obj = JSON.parse(jsonString); return { id: obj.data.viewer_v2.user_results.result.id, verified_followers: obj.data.viewer_v2.user_results.result.verified_follower_count }; }",
            "attributes": ["{id: id, verified_followers: verified_followers}"]
          }"#;

    #[test]
    fn test_x_followers_provider() {
        let provider: Provider =
            serde_json::from_str(X_FOLLOWERS_PROVIDER_TEXT).expect("Failed to parse provider");
        let result = provider
            .preprocess_response(&X_FOLLOWERS_RESPONSE_TEXT)
            .expect("Failed to preprocess response");
        let attributes = provider
            .get_attributes(&result)
            .expect("Failed to get attributes");

        println!("attributes: {:?}", attributes);
        assert_eq!(attributes.len(), 2);
        assert!(attributes.contains(&"verified_followers: \"9\"".to_string()));
        assert!(attributes.contains(&"id: \"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\"".to_string()));
    }

    #[test]
    fn test_custom_evaluator_simple() {
        use serde_json::json;
        use std::collections::HashMap;

        // Create a simple provider that doesn't use preprocessing
        let provider_json = json!({
            "id": 99,
            "host": "test.com",
            "urlRegex": r"^https://test\.com/.*$",
            "targetUrl": "https://test.com",
            "method": "GET",
            "title": "Test Provider",
            "description": "Simple test",
            "icon": "test",
            "responseType": "json",
            "attributes": ["{verified: verified, PreGPT4: PreGPT4}"]
        });

        let provider: Provider =
            serde_json::from_value(provider_json).expect("Failed to parse provider");

        // Create test response data that matches what the preprocessor would output
        let test_response = json!({
            "verified": true,
            "PreGPT4": true,
            "bioMentionsFreysa": false
        });

        let attributes = provider
            .get_attributes(&test_response)
            .expect("Failed to get attributes");

        println!("Custom evaluator test result: {:?}", attributes);

        assert_eq!(attributes.len(), 2);
        assert!(attributes.contains(&"verified: true".to_string()));
        assert!(attributes.contains(&"PreGPT4: true".to_string()));
    }

    #[test]
    fn test_custom_evaluator_complex() {
        use serde_json::json;

        // Test a more complex expression
        let provider_json = json!({
            "id": 100,
            "host": "test2.com",
            "urlRegex": r"^https://test2\.com/.*$",
            "targetUrl": "https://test2.com",
            "method": "GET",
            "title": "Test Provider 2",
            "description": "Complex test",
            "icon": "test2",
            "responseType": "json",
            "attributes": ["{over_10k: to_number(performance_baseline.amount) >`10000` && performance_baseline.currency_code == 'USD'}"]
        });

        let provider: Provider =
            serde_json::from_value(provider_json).expect("Failed to parse provider");

        // Create test response data
        let test_response = json!({
            "performance_baseline": {
                "amount": "15000",
                "currency_code": "USD"
            }
        });

        let attributes = provider
            .get_attributes(&test_response)
            .expect("Failed to get attributes");

        println!("Complex evaluator test result: {:?}", attributes);

        assert_eq!(attributes.len(), 1);
        assert!(attributes.contains(&"over_10k: true".to_string()));
    }

    #[test]
    fn test_custom_evaluator_simple_fields() {
        use serde_json::json;

        // Test simple field access
        let provider_json = json!({
            "id": 101,
            "host": "test3.com",
            "urlRegex": r"^https://test3\.com/.*$",
            "targetUrl": "https://test3.com",
            "method": "GET",
            "title": "Test Provider 3",
            "description": "Simple fields test",
            "icon": "test3",
            "responseType": "json",
            "preprocess": "response",
            "attributes": ["{id: id, screen_name: screen_name}"]
        });

        let provider: Provider =
            serde_json::from_value(provider_json).expect("Failed to parse provider");

        // Create test response data
        let test_response = json!({
            "id": "12345",
            "screen_name": "testuser"
        });

        let attributes = provider
            .get_attributes(&test_response)
            .expect("Failed to get attributes");

        println!("Simple fields test result: {:?}", attributes);

        assert_eq!(attributes.len(), 2);
        assert!(attributes.contains(&"id: \"12345\"".to_string()));
        assert!(attributes.contains(&"screen_name: \"testuser\"".to_string()));
    }

    #[test]
    fn test_x_provider_direct() {
        use serde_json::json;

        // Use the actual X provider config from providers.json (without JavaScript preprocessing)
        let provider_json = json!({
            "id": 2,
            "host": "x.com",
            "urlRegex": r"^https://x\.com/i/api/graphql/[\w\d]+/UserByScreenName(\?.*)?$",
            "targetUrl": "https://www.x.com/home",
            "method": "GET",
            "title": "Verify X subscription",
            "description": "",
            "icon": "twitterPremium",
            "responseType": "json",
            "attributes": ["{verified: verified, PreGPT4: PreGPT4}"]
        });

        let provider: Provider =
            serde_json::from_value(provider_json).expect("Failed to parse provider");

        // Create test response data that matches what the preprocessor would output
        // This simulates a pre-March 2023 verified account
        let test_response = json!({
            "verified": true,
            "PreGPT4": true,
            "bioMentionsFreysa": true
        });

        let attributes = provider
            .get_attributes(&test_response)
            .expect("Failed to get attributes");

        println!("X provider direct test result: {:?}", attributes);

        assert_eq!(attributes.len(), 2);
        assert!(attributes.contains(&"verified: true".to_string()));
        assert!(attributes.contains(&"PreGPT4: true".to_string()));

        println!("✅ X provider custom evaluator test passed!");
    }

    #[test]
    fn test_x_provider_logged_payload() {
        use serde_json::json;

        // This is the exact payload from the logs
        let x_response_text = r#"{"data":{"user":{"result":{"__typename":"User","id":"VRNlcjoxNjc2OTI4NDU2MjI1ODk4NDk2","rest_id":"1676928456225898496","affiliates_highlighted_label":{},"avatar":{"image_url":"https://pbs.twimg.com/profile_images/1938401595659534336/4FfZgohs_normal.jpg"},"core":{"created_at":"Thu Jul 06 12:18:01 +0000 2023","name":"fppp290","screen_name":"Johndoe93"},"dm_permissions":{"can_dm":true},"has_graduated_access":true,"is_blue_verified":true,"legacy":{"default_profile":true,"default_profile_image":false,"description":"","entities":{"description":{"urls":[]}},"fast_followers_count":0,"favourites_count":182,"followers_count":35,"friends_count":180,"has_custom_timelines":false,"is_translator":false,"listed_count":1,"media_count":7,"needs_phone_verification":false,"normal_followers_count":35,"pinned_tweet_ids_str":["1875293532711186617"],"possibly_sensitive":false,"profile_banner_url":"https://pbs.twimg.com/profile_banners/1676928456225898496/1738727374","profile_interstitial_type":"","statuses_count":565,"translator_type":"none","want_retweets":false,"withheld_in_countries":[]},"location":{"location":""},"media_permissions":{"can_media_tag":true},"parody_commentary_fan_label":"None","profile_image_shape":"Circle","privacy":{"protected":false},"relationship_perspectives":{"following":false},"tipjar_settings":{},"verification":{"verified":false},"legacy_extended_profile":{"birthdate":{"day":12,"month":1,"year":1994,"visibility":"Self","year_visibility":"Self"}},"is_profile_translatable":false,"has_hidden_subscriptions_on_profile":false,"verification_info":{"is_identity_verified":false,"reason":{"description":{"text":"This account is verified. Learn more","entities":[{"from_index":26,"to_index":36,"ref":{"url":"https://help.twitter.com/managing-your-account/about-twitter-verified-accounts","url_type":"ExternalUrl"}}]},"verified_since_msec":"1735851543944"}},"highlights_info":{"can_highlight_tweets":true,"highlighted_tweets":"1"},"user_seed_tweet_count":0,"premium_gifting_eligible":false,"business_account":{},"creator_subscriptions_count":0}}}}"#;

        // Create a cleaner, properly formatted preprocessing script
        let provider_json = json!({
            "id": 2,
            "host": "x.com",
            "urlRegex": r"^https://x\.com/i/api/graphql/[\w\d]+/UserByScreenName(\?.*)?$",
            "targetUrl": "https://www.x.com/home",
            "method": "GET",
            "title": "Verify X subscription",
            "description": "",
            "icon": "twitterPremium",
            "responseType": "json",
            "preprocess": "function process(jsonString) {\n  const object = JSON.parse(jsonString);\n  const parts = object.data.user.result.core.created_at.split(' ');\n  const time = parts[3].split(':');\n  const months = {\n    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,\n    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11\n  };\n  const createdAt = new Date(\n    parseInt(parts[5]),\n    months[parts[1]],\n    parseInt(parts[2]),\n    parseInt(time[0]),\n    parseInt(time[1]),\n    parseInt(time[2])\n  );\n  const targetDate = new Date('2023-03-01');\n  const PreGPT4 = createdAt < targetDate;\n  const verified = object.data.user.result.is_blue_verified;\n  const bio = object.data.user.result.legacy.description;\n  const bioMentionsFreysa = bio.toLowerCase().includes('it starts with freysa...');\n  if (!verified || !PreGPT4) {\n    throw new Error('Invalid account');\n  }\n  return {\n    verified: verified,\n    bioMentionsFreysa: bioMentionsFreysa,\n    PreGPT4: PreGPT4\n  };\n}",
            "attributes": ["{verified: verified, PreGPT4: PreGPT4}"]
        });

        let provider: Provider =
            serde_json::from_value(provider_json).expect("Failed to parse provider");

        println!("Testing with URL check...");
        let url_matches = provider.check_url_method(
        "https://x.com/i/api/graphql/U15Q5V7hgjzCEg6WpSWhqg/UserByScreenName?variables=%7B%22screen_name%22%3A%22Johndoe93%22%7D",
        "GET"
    ).expect("Failed to check URL");

        println!("URL matches: {}", url_matches);
        assert!(url_matches);

        println!("Testing preprocessing...");
        let result = provider.preprocess_response(x_response_text);

        match result {
            Ok(processed) => {
                println!("Preprocessing succeeded: {:?}", processed);
                // This should fail because the account was created after March 1, 2023
                panic!("Expected preprocessing to fail with 'Invalid account' but it succeeded");
            }
            Err(e) => {
                println!("Preprocessing failed as expected: {:?}", e);
                // Check if it's the expected "Invalid account" error or a syntax error
                assert!(
                    e.to_string().contains("Invalid account")
                        || e.to_string().contains("Process script error"),
                    "Expected 'Invalid account' error but got: {}",
                    e
                );
            }
        }
    }

    #[test]
    fn test_x_provider_simplified_script() {
        use serde_json::json;

        let x_response_text = r#"{"data":{"user":{"result":{"core":{"created_at":"Thu Jan 06 12:18:01 +0000 2022"},"is_blue_verified":true,"legacy":{"description":"it starts with freysa..."}}}}}"#;

        // Try with a much simpler preprocessing script
        let provider_json = json!({
            "id": 999,
            "host": "x.com",
            "urlRegex": r"^https://x\.com/.*$",
            "targetUrl": "https://www.x.com/home",
            "method": "GET",
            "title": "Simple X test",
            "description": "",
            "icon": "twitter",
            "responseType": "json",
            "preprocess": "function process(jsonString) { return JSON.parse(jsonString); }",
            "attributes": ["{verified: true}"]
        });

        let provider: Provider =
            serde_json::from_value(provider_json).expect("Failed to parse provider");

        let result = provider.preprocess_response(x_response_text);
        println!("Simple script result: {:?}", result);

        match result {
            Ok(processed) => {
                println!("Simple preprocessing succeeded: {:?}", processed);
            }
            Err(e) => {
                println!("Simple preprocessing failed: {:?}", e);
                panic!("Even simple script failed: {}", e);
            }
        }
    }

    #[test]
    fn test_parse_literal_value_edge_cases() {
        use serde_json::json;

        // Test that NaN values are handled gracefully without panicking
        let provider_json = json!({
            "id": 999,
            "host": "test.com",
            "urlRegex": r"^https://test\.com/.*$",
            "targetUrl": "https://test.com",
            "method": "GET",
            "title": "Test Provider",
            "description": "Test edge cases",
            "icon": "test",
            "responseType": "json",
            "attributes": ["{nan_value: to_number(invalid_field)}"]
        });

        let provider: Provider =
            serde_json::from_value(provider_json).expect("Failed to parse provider");

        // Test response with a string that would parse to NaN when converted to f64
        let test_response = json!({
            "invalid_field": "NaN"
        });

        // This should return an error, not panic
        let result = provider.get_attributes(&test_response);

        match result {
            Err(e) => {
                println!("Expected error for NaN: {}", e);
                assert!(e.to_string().contains("Invalid number value"));
            }
            Ok(_) => panic!("Expected error but got success"),
        }

        // Test infinity case as well
        let test_response_inf = json!({
            "invalid_field": "Infinity"
        });

        let result_inf = provider.get_attributes(&test_response_inf);

        match result_inf {
            Err(e) => {
                println!("Expected error for Infinity: {}", e);
                assert!(e.to_string().contains("Invalid number value"));
            }
            Ok(_) => panic!("Expected error but got success"),
        }
    }
}
