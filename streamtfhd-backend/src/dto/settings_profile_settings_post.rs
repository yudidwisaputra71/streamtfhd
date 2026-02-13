#[derive(serde::Serialize)]
#[derive(serde::Deserialize)]
pub struct ProfileSettingsData {
    pub avatar: Option<String>,
    pub username: Option<String>
}