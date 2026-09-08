# 饮水助手

一个适合 iPhone/iPad 添加到主屏幕使用的喝水记录与提醒 PWA。

## 本地运行

```powershell
npm start
```

打开：

```text
http://localhost:4173
```

## 已有功能

- 根据性别、年龄、体重、身高、活动量、气温、湿度估算每日目标
- 可以实时修改今日饮水目标
- 支持 100/200/250/350/500 ml 快速记录和自定义记录
- 保存今日记录、撤销最近一杯、删除单条记录、清空今天
- 支持浏览器通知提醒，iPhone 通知可同步到 Apple Watch
- 可生成 Apple 日历提醒文件，让手表提醒更稳定
- 支持添加到 iPhone/iPad 主屏幕
- 支持离线打开已缓存的 App 外壳

## 放到手机上

公开部署地址：

```text
https://bcristiano-water-assistant.bcristianooooo.chatgpt.site
```

在 iPhone 上用 Safari 打开网址，点击分享按钮，选择“添加到主屏幕”。

每个人填写的信息和喝水记录都保存在自己的手机或浏览器本地，不会共享给其他打开这个网址的人。

通知提醒需要在手机上打开通知权限。网页 App 的本地定时提醒依赖 App 保持运行；如果需要完全后台、定时推送到 Apple Watch，需要再接入服务器推送。

也可以在“提醒节奏”里点“日历提醒”，把生成的 `water-reminders.ics` 添加到 Apple 日历。日历提醒会更稳定地同步到 Apple Watch。
