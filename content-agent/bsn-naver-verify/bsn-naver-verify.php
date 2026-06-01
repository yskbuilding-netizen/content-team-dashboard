<?php
/*
Plugin Name: BSN Naver Site Verification
Description: 네이버 서치 어드바이저 사이트 확인 메타 태그 자동 삽입
Version: 1.0
Author: BSN Group
*/

if (!defined('ABSPATH')) exit;

add_action('wp_head', function() {
    echo '<meta name="naver-site-verification" content="b1c2a57e86a41909a6d3cd4d544315b4dc8501e8" />' . "\n";
}, 1);
