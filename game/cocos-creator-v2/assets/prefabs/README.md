# 预制体占位说明

建议先创建这些 Prefab：

- `FaceBall.prefab`：Sprite + RigidBody2D + CircleCollider2D + FaceItem。
- `MergeFx.prefab`：粒子或动画节点，由 EffectManager 复用。
- `ScorePop.prefab`：飘字节点，由 EffectManager 复用。
- `StateButton.prefab`：Sprite + ButtonStateAudio。

Prefab 文件应由 Cocos Creator 生成，不手写 JSON。
