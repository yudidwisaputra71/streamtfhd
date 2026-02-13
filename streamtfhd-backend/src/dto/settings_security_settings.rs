#[derive(serde::Serialize)]
#[derive(serde::Deserialize)]
pub struct SecuritySettingsData {
    pub current_password: Option<String>,
    pub new_password: Option<String>,
    pub confirm_password: Option<String>
}